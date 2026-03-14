import { PartsService } from '@/modules/parts/parts.service';
import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('PartsService', () => {
  const createPrisma = () => ({
    part: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  });

  beforeEach(() => jest.clearAllMocks());

  it('creates parts using decimal strings', async () => {
    const prisma = createPrisma();
    prisma.part.findUnique.mockResolvedValueOnce(null);
    const created = {
      id: 1,
      sku: 'P01',
      name: 'Filtro',
      unitCost: new Prisma.Decimal('20'),
      unitPrice: new Prisma.Decimal('35'),
      stockQty: 10,
      active: true,
    };
    prisma.part.create.mockImplementation(async ({ data }: any) => {
      expect(data.unitCost).toBeInstanceOf(Prisma.Decimal);
      expect(data.unitPrice).toBeInstanceOf(Prisma.Decimal);
      return created;
    });

    const service = new PartsService(prisma as any);
    const result = await service.create({ sku: 'P01', name: 'Filtro', unitCost: '20', unitPrice: '35', stockQty: 10 } as any);
    expect(result).toEqual(created);
  });

  it('prevents negative inventory adjustments', async () => {
    const prisma = createPrisma();
    const existing = {
      id: 1,
      sku: 'P01',
      name: 'Filtro',
      unitCost: new Prisma.Decimal('20'),
      unitPrice: new Prisma.Decimal('35'),
      stockQty: 2,
      active: true,
    };
    prisma.part.findUnique.mockResolvedValue(existing);

    const service = new PartsService(prisma as any);
    await expect(service.adjustStock(1, -5)).rejects.toThrow(BadRequestException);
    expect(prisma.part.update).not.toHaveBeenCalled();
  });

  it('validates unique sku on create', async () => {
    const prisma = createPrisma();
    prisma.part.findUnique.mockResolvedValueOnce({ id: 99 });
    const service = new PartsService(prisma as any);
    await expect(
      service.create({ sku: 'DUP', name: 'Duplicado', unitCost: '10', unitPrice: '20' } as any),
    ).rejects.toThrow('sku já cadastrado');
  });

  it('updates decimal fields correctly', async () => {
    const prisma = createPrisma();
    prisma.part.findUnique.mockResolvedValueOnce({ id: 2 });
    prisma.part.findFirst.mockResolvedValueOnce(null);
    prisma.part.update.mockImplementation(async ({ data }: any) => {
      expect(data.unitCost).toBeInstanceOf(Prisma.Decimal);
      expect(data.unitPrice).toBeInstanceOf(Prisma.Decimal);
      return { id: 2, ...data };
    });

    const service = new PartsService(prisma as any);
    await service.update(2, { unitCost: '11.50', unitPrice: '22.70' });
    expect(prisma.part.update).toHaveBeenCalled();
  });

  it('increments stock when delta é positivo', async () => {
    const prisma = createPrisma();
    prisma.part.findUnique.mockResolvedValue({
      id: 3,
      sku: 'P03',
      name: 'Parafuso',
      unitCost: new Prisma.Decimal('1'),
      unitPrice: new Prisma.Decimal('2'),
      stockQty: 1,
      active: true,
    });
    prisma.part.update.mockResolvedValue({ id: 3, stockQty: 4 });
    const service = new PartsService(prisma as any);
    const updated = await service.adjustStock(3, 3);
    expect(updated.stockQty).toBe(4);
  });
});
