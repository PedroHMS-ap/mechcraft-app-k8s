import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    const basePayload = {
      requestId: (req as any).requestId ?? req.headers['x-request-id'] ?? null,
      method: req.method,
      path: req.originalUrl ?? req.url,
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startedAt;
          this.logger.log(
            JSON.stringify({
              ...basePayload,
              statusCode: res.statusCode,
              durationMs: duration,
              event: 'request_completed',
            }),
          );
        },
        error: (error: any) => {
          const duration = Date.now() - startedAt;
          this.logger.error(
            JSON.stringify({
              ...basePayload,
              statusCode: res.statusCode || 500,
              durationMs: duration,
              event: 'request_failed',
              error: error?.message ?? 'unknown_error',
            }),
          );
        },
      }),
    );
  }
}

