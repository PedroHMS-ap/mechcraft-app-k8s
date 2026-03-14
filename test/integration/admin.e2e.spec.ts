import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

describe('E2E admin (customers/vehicles)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const customers: any[] = [];
    const vehicles: any[] = [];
    let cseq = 1;
    let vseq = 1;

    const prismaStub: Partial<PrismaService> = {
      customer: {
        findFirst: async ({ where }: any) => {
          if (where?.document) return customers.find(c => c.document === where.document) ?? null;
          return null;
        },
        findUnique: async ({ where }: any) => customers.find(c => c.id === where.id) ?? null,
        create: async ({ data }: any) => {
          const created = { id: cseq++, createdAt: new Date(), updatedAt: new Date(), ...data };
          customers.push(created);
          return created;
        },
      } as any,
      vehicle: {
        findFirst: async ({ where }: any) => vehicles.find(v => v.plate === where.plate) ?? null,
        create: async ({ data }: any) => {
          const created = { id: vseq++, createdAt: new Date(), updatedAt: new Date(), ...data };
          vehicles.push(created);
          return created;
        },
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

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    token = res.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /customers (admin) creates a customer', async () => {
    const body = { name: 'Cliente Teste', document: '52998224725', phone: '11999999999', email: 'c@ex.com' };
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Cliente Teste');
  });

  it('POST /vehicles (admin) creates a vehicle linked to customer', async () => {
    // customer with id=1 was created in previous test
    const body = { plate: 'ABC1D23', make: 'Fiat', model: 'Uno', year: 2012, customerId: 1 };
    const res = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.plate).toBe('ABC1D23');
  });
});

