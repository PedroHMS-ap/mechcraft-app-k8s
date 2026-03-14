import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';

type RateEntry = { count: number; expiresAt: number };

const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') {
    return value.replace(/[<>]/g, ch => (ch === '<' ? '&lt;' : '&gt;'));
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      result[key] = sanitizeValue(value[key]);
    }
    return result;
  }
  return value;
};

const sanitizeMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
};

const createRateLimiter = (windowMs: number, max: number) => {
  const hits = new Map<string, RateEntry>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'global';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.expiresAt < now) {
      hits.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ message: 'Too many requests' });
    }
    entry.count += 1;
    next();
  };
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const bodyLimit = process.env.BODY_LIMIT ?? '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));
  app.use(securityHeaders);
  app.use(sanitizeMiddleware);
  const httpAdapter: any = (app as any).getHttpAdapter?.();
  const instance: any = httpAdapter?.getInstance?.();
  if (instance?.set) {
    instance.set('trust proxy', 1);
  }
  // Rate limiting (bypass Swagger and health to evitar 429 em /docs)
  const rateLimiter = createRateLimiter(15 * 60 * 1000, Number(process.env.RATE_LIMIT_MAX ?? 100));
  app.use((req, res, next) => {
    const path = req.path || req.url;
    if (path.startsWith('/docs') || path.startsWith('/docs-json') || path === '/health') {
      return next();
    }
    return rateLimiter(req, res, next);
  });

  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean);
  app.enableCors({
    origin: allowedOrigins?.length ? allowedOrigins : true,
    credentials: true,
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const existing = req.headers['x-request-id'];
    const requestId = typeof existing === 'string' ? existing : randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.useGlobalInterceptors(new RequestLoggerInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Mech Craft API')
    .setDescription('Documentação da API monolítica')
    .setVersion('1.0.0')
    .addBearerAuth(
       {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
      description: 'Cole APENAS o token (sem "Bearer ")',
      },
      'bearer'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
