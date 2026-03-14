// src/modules/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async averageLeadTime() {
    const finished = await this.prisma.workOrder.findMany({
      where: { finishedAt: { not: null } },
      select: { createdAt: true, finishedAt: true },
    });
    if (!finished.length) return 0;

    const days = finished.map(w =>
      (w.finishedAt!.getTime() - w.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const avg = days.reduce((a, b) => a + b, 0) / days.length;
    return Math.round(avg); // ajuste se quiser média exata
  }

  async countByStatus() {
    const rows = await this.prisma.workOrder.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    return rows.map(r => ({ status: r.status, count: r._count._all }));
  }

  async topServices({ from, to, limit = 5 }: { from?: Date; to?: Date; limit?: number } = {}) {
    const where: Prisma.WorkOrderServiceWhereInput = {};
    if (from || to) where.createdAt = { gte: from, lte: to };

    const groups = await this.prisma.workOrderService.groupBy({
      by: ['serviceId'],
      where,
      _sum: { total: true, qty: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const ids = groups.map(g => g.serviceId);
    const catalog = await this.prisma.serviceCatalog.findMany({ where: { id: { in: ids } } });
    const byId = new Map(catalog.map(c => [c.id, c]));

    return groups.map(g => ({
      serviceId: g.serviceId,
      name: byId.get(g.serviceId)?.name,
      sumTotal: Number((g._sum.total ?? new Prisma.Decimal(0)).toString()),
      sumQty: Number(g._sum.qty ?? 0),
    }));
  }

  async topParts({ from, to, limit = 5 }: { from?: Date; to?: Date; limit?: number } = {}) {
    const where: Prisma.WorkOrderPartWhereInput = {};
    if (from || to) where.createdAt = { gte: from, lte: to };

    const groups = await this.prisma.workOrderPart.groupBy({
      by: ['partId'],
      where,
      _sum: { total: true, qty: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const ids = groups.map(g => g.partId);
    const parts = await this.prisma.part.findMany({ where: { id: { in: ids } } });
    const byId = new Map(parts.map(p => [p.id, p]));

    return groups.map(g => ({
      partId: g.partId,
      name: byId.get(g.partId)?.name,
      sumTotal: Number((g._sum.total ?? new Prisma.Decimal(0)).toString()),
      sumQty: Number(g._sum.qty ?? 0),
    }));
  }

  async totalRevenue({ from, to }: { from?: Date; to?: Date } = {}) {
    const where: any = {};
    if (from || to) where.finishedAt = { gte: from, lte: to };

    const agg = await this.prisma.workOrder.aggregate({
      _sum: { total: true },
      where,
    });

    return Number((agg._sum.total ?? new Prisma.Decimal(0)).toString());
  }

  async dailyOrderVolume(days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const orders = await this.prisma.workOrder.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay = new Map<string, number>();
    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    return Array.from(byDay.entries()).map(([day, count]) => ({ day, count }));
  }

  async averageExecutionTimeByStatus() {
    const rows = await this.prisma.workOrder.findMany({
      select: {
        createdAt: true,
        estimateSentAt: true,
        startedAt: true,
        finishedAt: true,
        deliveredAt: true,
      },
    });

    const diagnosingHours: number[] = [];
    const executionHours: number[] = [];
    const finalizationHours: number[] = [];

    for (const row of rows) {
      if (row.estimateSentAt) {
        diagnosingHours.push((row.estimateSentAt.getTime() - row.createdAt.getTime()) / 36e5);
      }
      if (row.startedAt && row.finishedAt) {
        executionHours.push((row.finishedAt.getTime() - row.startedAt.getTime()) / 36e5);
      }
      if (row.finishedAt && row.deliveredAt) {
        finalizationHours.push((row.deliveredAt.getTime() - row.finishedAt.getTime()) / 36e5);
      }
    }

    const average = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((acc, v) => acc + v, 0) / arr.length) * 100) / 100 : 0;

    return {
      diagnosingAvgHours: average(diagnosingHours),
      executionAvgHours: average(executionHours),
      finalizationAvgHours: average(finalizationHours),
    };
  }

  async integrationFailuresSummary() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [webhookDenials, stuckWaitingApproval] = await Promise.all([
      this.prisma.workOrder.count({
        where: {
          deniedAt: { not: null },
          OR: [{ deniedBy: { startsWith: 'webhook-' } }, { denialReason: { contains: 'extern' } }],
        },
      }),
      this.prisma.workOrder.count({
        where: {
          status: 'WAITING_APPROVAL',
          estimateSentAt: { lt: oneDayAgo },
        },
      }),
    ]);

    return {
      webhookDenials,
      stuckWaitingApproval,
      totalIntegrationFailures: webhookDenials + stuckWaitingApproval,
    };
  }
}
