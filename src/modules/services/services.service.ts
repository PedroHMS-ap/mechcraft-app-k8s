import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    // code único
    const exists = await this.prisma.serviceCatalog.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException('code já cadastrado');

    return this.prisma.serviceCatalog.create({
      data: {
        code: dto.code,
        name: dto.name,
        unitPrice: new Prisma.Decimal(dto.unitPrice),
        active: dto.active ?? true,
      },
    });
  }

  async list(params?: { q?: string; active?: boolean }) {
    const { q, active } = params || {};
    return this.prisma.serviceCatalog.findMany({
      where: {
        AND: [
          q ? { OR: [{ code: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }] } : {},
          active !== undefined ? { active } : {},
        ],
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  async byId(id: number) {
    const s = await this.prisma.serviceCatalog.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Serviço não encontrado');
    return s;
  }

  async update(id: number, dto: UpdateServiceDto) {
    await this.byId(id);
    if (dto.code) {
      const exists = await this.prisma.serviceCatalog.findFirst({ where: { code: dto.code, NOT: { id } } });
      if (exists) throw new BadRequestException('code já usado por outro serviço');
    }
    const data: any = { ...dto };
    if (dto.unitPrice !== undefined) data.unitPrice = new Prisma.Decimal(dto.unitPrice);
    return this.prisma.serviceCatalog.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.byId(id);
    return this.prisma.serviceCatalog.update({ where: { id }, data: { active: false } });
  }
}
