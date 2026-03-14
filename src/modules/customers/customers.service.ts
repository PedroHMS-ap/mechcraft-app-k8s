import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

function normalizeDocument(doc?: string) {
  return doc ? doc.replace(/\D/g, '') : undefined;
}

function isDocLengthOk(doc?: string) {
  return !doc || doc.length === 11 || doc.length === 14;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const document = normalizeDocument(dto.document);
    if (!isDocLengthOk(document)) {
      throw new BadRequestException('Documento deve ter 11 (CPF) ou 14 (CNPJ) digitos');
    }
    if (document) {
      const exists = await this.prisma.customer.findFirst({ where: { document } });
      if (exists) throw new BadRequestException('Documento ja cadastrado');
    }
    return this.prisma.customer.create({
      data: {
        name: dto.name,
        document,
        phone: dto.phone,
        email: dto.email,
        active: dto.active ?? true,
      },
    });
  }

  async findById(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Cliente nao encontrado');
    return customer;
  }

  async search(params: { document?: string; name?: string }) {
    const { document, name } = params;
    return this.prisma.customer.findMany({
      where: {
        AND: [
          document ? { document: normalizeDocument(document) } : {},
          name ? { name: { contains: name, mode: 'insensitive' } } : {},
        ],
      },
      orderBy: { id: 'desc' },
      take: 50,
    });
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findById(id);

    const document = normalizeDocument(dto.document);
    if (!isDocLengthOk(document)) {
      throw new BadRequestException('Documento deve ter 11 (CPF) ou 14 (CNPJ) digitos');
    }
    if (document) {
      const exists = await this.prisma.customer.findFirst({
        where: { document, NOT: { id } },
      });
      if (exists) throw new BadRequestException('Documento ja cadastrado em outro cliente');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        document,
      },
    });
  }
}

