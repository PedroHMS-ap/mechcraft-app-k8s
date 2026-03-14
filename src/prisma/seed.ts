import { PrismaClient, WorkOrderStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ---- Clientes (usa o unique correto: document) ----
  const customer = await prisma.customer.upsert({
    where: { document: '12345678901' }, // <- CPF/CNPJ único no seu schema
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      document: '12345678901',
    },
  });

  // ---- Veículo (plate é unique) ----
  const vehicle = await prisma.vehicle.upsert({
    where: { plate: 'ABC1234' },
    update: {},
    create: {
      plate: 'ABC1234',
      make: 'Fiat',
      model: 'Uno',
      year: 2010,
      customerId: customer.id,
    },
  });

  // ---- Catálogo de serviços (code é unique) ----
  const service1 = await prisma.serviceCatalog.upsert({
    where: { code: 'TROCA_OLEO' },
    update: {},
    create: {
      code: 'TROCA_OLEO',
      name: 'Troca de óleo',
      unitPrice: 120,
      active: true,
    },
  });

  const service2 = await prisma.serviceCatalog.upsert({
    where: { code: 'ALINHAMENTO' },
    update: {},
    create: {
      code: 'ALINHAMENTO',
      name: 'Alinhamento e balanceamento',
      unitPrice: 180,
      active: true,
    },
  });

  // ---- Peça (se name NÃO é unique, faz find-or-create) ----
  const part =
    (await prisma.part.findFirst({ where: { name: 'Filtro de óleo' } })) ??
    (await prisma.part.create({
      data: { name: 'Filtro de óleo', unitPrice: 35, stockQty: 50, sku: 'FLT-001', unitCost: 25 },
    }));

  // ---- Ordem de serviço base ----
  await prisma.workOrder.create({
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      description: 'OS de exemplo',
      status: WorkOrderStatus.RECEIVED,
      subtotalServices: 0,
      subtotalParts: 0,
      discount: 0,
      total: 0,
    },
  });

  console.log('✅ Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
