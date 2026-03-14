import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/public.decorator';


@ApiTags('07 - Public')
@Controller('public/workorders')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get(':code')
  async byCode(@Param('code') code: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { publicCode: code },
      include: {
        services: { include: { service: true } },
        parts: { include: { part: true } },
      },
    });
    if (!wo) throw new NotFoundException();
    // resposta “safe” para cliente
    return {
      code: wo.publicCode,
      status: wo.status,
      description: wo.description,
      totals: {
        services: wo.subtotalServices,
        parts: wo.subtotalParts,
        total: wo.total,
        discount: wo.discount,
      },
      timestamps: {
        estimateSentAt: wo.estimateSentAt,
        approvedAt: wo.approvedAt,
        startedAt: wo.startedAt,
        finishedAt: wo.finishedAt,
        deliveredAt: wo.deliveredAt,
      },
      items: {
        services: wo.services.map(i => ({
          name: i.service.name, qty: i.qty, total: i.total,
        })),
        parts: wo.parts.map(i => ({
          name: i.part.name, qty: i.qty, total: i.total,
        })),
      },
    };
  }
}
