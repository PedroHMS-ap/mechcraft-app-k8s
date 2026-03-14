import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePartDto, UpdatePartDto } from './dto';

@Injectable()
export class PartsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePartDto) {
    const exists = await this.prisma.part.findUnique({ where: { sku: dto.sku } });
    if (exists) throw new BadRequestException('sku já cadastrado');

    return this.prisma.part.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        unitCost: new Prisma.Decimal(dto.unitCost),
        unitPrice: new Prisma.Decimal(dto.unitPrice),
        stockQty: dto.stockQty ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async list(params?: { q?: string; active?: boolean }) {
    const { q, active } = params || {};
    return this.prisma.part.findMany({
      where: {
        AND: [
          q ? { OR: [{ sku: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }] } : {},
          active !== undefined ? { active } : {},
        ],
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  async byId(id: number) {
    const p = await this.prisma.part.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Peça não encontrada');
    return p;
  }

  async update(id: number, dto: UpdatePartDto) {
    await this.byId(id);
    if (dto.sku) {
      const exists = await this.prisma.part.findFirst({ where: { sku: dto.sku, NOT: { id } } });
      if (exists) throw new BadRequestException('sku já usado por outra peça');
    }
    const data: any = { ...dto };
    if (dto.unitCost !== undefined) data.unitCost = new Prisma.Decimal(dto.unitCost);
    if (dto.unitPrice !== undefined) data.unitPrice = new Prisma.Decimal(dto.unitPrice);
    return this.prisma.part.update({ where: { id }, data });
  }

  async adjustStock(id: number, delta: number) {
    const current = await this.byId(id);
    const newQty = current.stockQty + delta;
    if (newQty < 0) throw new BadRequestException('Estoque não pode ficar negativo');
    return this.prisma.part.update({
      where: { id },
      data: { stockQty: { set: newQty } },
    });
  }

  async deactivate(id: number) {
    await this.byId(id);
    return this.prisma.part.update({ where: { id }, data: { active: false } });
  }
}
