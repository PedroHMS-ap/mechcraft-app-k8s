import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

describe('E2E basic (auth/public)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prismaStub: Partial<PrismaService> = {
      workOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
      } as any,
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, forbidUnknownValues: true })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login returns token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    expect(res.body.access_token).toBeDefined();
  });

  it('GET /customers without token is 401', async () => {
    await request(app.getHttpServer()).get('/customers').expect(401);
  });

  it('GET /public/workorders/:code returns 404 for unknown code', async () => {
    await request(app.getHttpServer()).get('/public/workorders/UNKNOWN').expect(404);
  });
});
