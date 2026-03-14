import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';

function normalizePlate(plate: string) {
  return plate.replace('-', '').toUpperCase();
}

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new BadRequestException('Cliente não encontrado');

    const plate = normalizePlate(dto.plate);
    const exists = await this.prisma.vehicle.findFirst({ where: { plate } });
    if (exists) throw new BadRequestException('Placa já cadastrada');

    return this.prisma.vehicle.create({
      data: {
        plate,
        make: dto.make,
        model: dto.model,
        year: dto.year ?? null,
        customerId: dto.customerId,
      },
    });
  }

  async byPlate(plate: string) {
    const v = await this.prisma.vehicle.findFirst({ where: { plate: normalizePlate(plate) } });
    if (!v) throw new NotFoundException('Veículo não encontrado');
    return v;
  }

  async byId(id: number) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Veículo não encontrado');
    return v;
  }

  async update(id: number, dto: UpdateVehicleDto) {
    await this.byId(id);
    const data: any = { ...dto };
    if (dto.plate) {
      const normalized = normalizePlate(dto.plate);
      const exists = await this.prisma.vehicle.findFirst({
        where: { plate: normalized, NOT: { id } },
      });
      if (exists) throw new BadRequestException('Placa já cadastrada');
      data.plate = normalized;
    }
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  async listByCustomer(customerId: number) {
    // útil para tela de cliente
    return this.prisma.vehicle.findMany({
      where: { customerId },
      orderBy: { id: 'desc' },
    });
  }
}
