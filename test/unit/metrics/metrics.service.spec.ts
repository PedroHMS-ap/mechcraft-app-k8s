import { MetricsService } from '@/modules/metrics/metrics.service';
import { Prisma } from '@prisma/client';

describe('MetricsService', () => {
  const createPrisma = () => ({
    workOrder: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    workOrderService: {
      groupBy: jest.fn(),
    },
    workOrderPart: {
      groupBy: jest.fn(),
    },
    serviceCatalog: {
      findMany: jest.fn(),
    },
    part: {
      findMany: jest.fn(),
    },
  });

  beforeEach(() => jest.clearAllMocks());

  it('computes average lead time rounded', async () => {
    const prisma = createPrisma();
    prisma.workOrder.findMany.mockResolvedValue([
      { createdAt: new Date('2024-01-01T00:00:00Z'), finishedAt: new Date('2024-01-04T00:00:00Z') },
      { createdAt: new Date('2024-01-01T00:00:00Z'), finishedAt: new Date('2024-01-03T12:00:00Z') },
    ]);
    const service = new MetricsService(prisma as any);
    await expect(service.averageLeadTime()).resolves.toBe(3);
  });

  it('returns grouped status counts', async () => {
    const prisma = createPrisma();
    prisma.workOrder.groupBy.mockResolvedValue([
      { status: 'DELIVERED', _count: { _all: 2 } },
      { status: 'WAITING_APPROVAL', _count: { _all: 1 } },
    ]);
    const service = new MetricsService(prisma as any);
    const result = await service.countByStatus();
    expect(result).toEqual([
      { status: 'DELIVERED', count: 2 },
      { status: 'WAITING_APPROVAL', count: 1 },
    ]);
  });

  it('returns top services and parts with names', async () => {
    const prisma = createPrisma();
    prisma.workOrderService.groupBy.mockResolvedValue([
      { serviceId: 1, _sum: { total: new Prisma.Decimal(200), qty: 3 } },
    ]);
    prisma.workOrderPart.groupBy.mockResolvedValue([
      { partId: 5, _sum: { total: new Prisma.Decimal(120), qty: 4 } },
    ]);
    prisma.serviceCatalog.findMany.mockResolvedValue([{ id: 1, name: 'Revisão' }]);
    prisma.part.findMany.mockResolvedValue([{ id: 5, name: 'Filtro' }]);

    const service = new MetricsService(prisma as any);
    const [topServices, topParts] = await Promise.all([service.topServices(), service.topParts()]);

    expect(topServices[0]).toMatchObject({ serviceId: 1, name: 'Revisão' });
    expect(topParts[0]).toMatchObject({ partId: 5, name: 'Filtro' });
  });

  it('sums total revenue with filters', async () => {
    const prisma = createPrisma();
    prisma.workOrder.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(500) } });
    const service = new MetricsService(prisma as any);
    const revenue = await service.totalRevenue({ from: new Date(), to: new Date() });
    expect(revenue).toBe(500);
  });
});
