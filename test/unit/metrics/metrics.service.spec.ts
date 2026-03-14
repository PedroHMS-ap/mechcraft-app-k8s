import { MetricsService } from '@/modules/metrics/metrics.service';
import { Prisma } from '@prisma/client';

describe('MetricsService', () => {
  const createPrisma = () => ({
    workOrder: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
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
  afterEach(() => jest.useRealTimers());

  it('computes average lead time rounded', async () => {
    const prisma = createPrisma();
    prisma.workOrder.findMany.mockResolvedValue([
      { createdAt: new Date('2024-01-01T00:00:00Z'), finishedAt: new Date('2024-01-04T00:00:00Z') },
      { createdAt: new Date('2024-01-01T00:00:00Z'), finishedAt: new Date('2024-01-03T12:00:00Z') },
    ]);

    const service = new MetricsService(prisma as any);

    await expect(service.averageLeadTime()).resolves.toBe(3);
  });

  it('returns zero average lead time when there are no finished work orders', async () => {
    const prisma = createPrisma();
    prisma.workOrder.findMany.mockResolvedValue([]);

    const service = new MetricsService(prisma as any);

    await expect(service.averageLeadTime()).resolves.toBe(0);
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
    prisma.serviceCatalog.findMany.mockResolvedValue([{ id: 1, name: 'Revisao' }]);
    prisma.part.findMany.mockResolvedValue([{ id: 5, name: 'Filtro' }]);

    const service = new MetricsService(prisma as any);
    const [topServices, topParts] = await Promise.all([service.topServices(), service.topParts()]);

    expect(topServices[0]).toMatchObject({ serviceId: 1, name: 'Revisao' });
    expect(topParts[0]).toMatchObject({ partId: 5, name: 'Filtro' });
  });

  it('applies date filters and zero fallbacks in top services and parts', async () => {
    const prisma = createPrisma();
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-31T23:59:59Z');

    prisma.workOrderService.groupBy.mockResolvedValue([
      { serviceId: 2, _sum: { total: null, qty: null } },
    ]);
    prisma.workOrderPart.groupBy.mockResolvedValue([
      { partId: 8, _sum: { total: null, qty: null } },
    ]);
    prisma.serviceCatalog.findMany.mockResolvedValue([{ id: 2, name: 'Alinhamento' }]);
    prisma.part.findMany.mockResolvedValue([{ id: 8, name: 'Pastilha' }]);

    const service = new MetricsService(prisma as any);
    const [topServices, topParts] = await Promise.all([
      service.topServices({ from, to, limit: 3 }),
      service.topParts({ from, to, limit: 2 }),
    ]);

    expect(prisma.workOrderService.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { gte: from, lte: to } },
        take: 3,
      }),
    );
    expect(prisma.workOrderPart.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { gte: from, lte: to } },
        take: 2,
      }),
    );
    expect(topServices[0]).toMatchObject({ serviceId: 2, name: 'Alinhamento', sumTotal: 0, sumQty: 0 });
    expect(topParts[0]).toMatchObject({ partId: 8, name: 'Pastilha', sumTotal: 0, sumQty: 0 });
  });

  it('sums total revenue with filters', async () => {
    const prisma = createPrisma();
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-31T23:59:59Z');
    prisma.workOrder.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(500) } });

    const service = new MetricsService(prisma as any);
    const revenue = await service.totalRevenue({ from, to });

    expect(prisma.workOrder.aggregate).toHaveBeenCalledWith({
      _sum: { total: true },
      where: { finishedAt: { gte: from, lte: to } },
    });
    expect(revenue).toBe(500);
  });

  it('returns zero revenue when aggregate total is null', async () => {
    const prisma = createPrisma();
    prisma.workOrder.aggregate.mockResolvedValue({ _sum: { total: null } });

    const service = new MetricsService(prisma as any);

    await expect(service.totalRevenue()).resolves.toBe(0);
  });

  it('groups daily order volume by day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-10T12:00:00Z'));
    const prisma = createPrisma();
    prisma.workOrder.findMany.mockResolvedValue([
      { createdAt: new Date('2026-01-08T08:00:00Z') },
      { createdAt: new Date('2026-01-08T10:30:00Z') },
      { createdAt: new Date('2026-01-09T09:15:00Z') },
    ]);

    const service = new MetricsService(prisma as any);
    const result = await service.dailyOrderVolume(7);

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: new Date('2026-01-03T12:00:00Z') } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([
      { day: '2026-01-08', count: 2 },
      { day: '2026-01-09', count: 1 },
    ]);
  });

  it('computes average execution time by status and keeps zero for missing stages', async () => {
    const prisma = createPrisma();
    prisma.workOrder.findMany.mockResolvedValue([
      {
        createdAt: new Date('2026-01-01T08:00:00Z'),
        estimateSentAt: new Date('2026-01-01T10:00:00Z'),
        startedAt: new Date('2026-01-01T12:00:00Z'),
        finishedAt: new Date('2026-01-01T18:00:00Z'),
        deliveredAt: new Date('2026-01-02T00:00:00Z'),
      },
      {
        createdAt: new Date('2026-01-02T08:00:00Z'),
        estimateSentAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
      },
    ]);

    const service = new MetricsService(prisma as any);

    await expect(service.averageExecutionTimeByStatus()).resolves.toEqual({
      diagnosingAvgHours: 2,
      executionAvgHours: 6,
      finalizationAvgHours: 6,
    });
  });

  it('summarizes integration failures from webhook denials and stuck approvals', async () => {
    const prisma = createPrisma();
    prisma.workOrder.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

    const service = new MetricsService(prisma as any);
    const result = await service.integrationFailuresSummary();

    expect(prisma.workOrder.count).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          deniedAt: { not: null },
        }),
      }),
    );
    expect(prisma.workOrder.count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'WAITING_APPROVAL',
          estimateSentAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      }),
    );
    expect(result).toEqual({
      webhookDenials: 2,
      stuckWaitingApproval: 3,
      totalIntegrationFailures: 5,
    });
  });
});
