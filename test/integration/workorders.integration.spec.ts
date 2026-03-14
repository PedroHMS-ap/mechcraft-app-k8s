import { WorkOrdersService } from '@/modules/workorders/workorders.service';
import { PartsService } from '@/modules/parts/parts.service';
import { ServicesService } from '@/modules/services/services.service';
import { CustomersService } from '@/modules/customers/customers.service';
import { VehiclesService } from '@/modules/vehicles/vehicles.service';
import { MetricsService } from '@/modules/metrics/metrics.service';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BudgetNotifierService } from '@/common/notifications/budget-notifier.service';

function createPrismaStub() {
  type CustomerEntity = {
    id: number;
    name: string;
    document: string | null;
    phone?: string | null;
    email?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  type VehicleEntity = {
    id: number;
    plate: string;
    make: string;
    model: string;
    year: number | null;
    customerId: number;
    createdAt: Date;
    updatedAt: Date;
  };
  type ServiceEntity = {
    id: number;
    code: string;
    name: string;
    unitPrice: Prisma.Decimal;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  type PartEntity = {
    id: number;
    sku: string;
    name: string;
    unitCost: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    stockQty: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  type WorkOrderEntity = {
    id: number;
    customerId: number;
    vehicleId: number;
    description: string;
    status: WorkOrderStatus;
    subtotalServices: Prisma.Decimal;
    subtotalParts: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
    publicCode: string;
    estimateSentAt: Date | null;
    estimateSentBy: string | null;
    approvedAt: Date | null;
    approvedBy: string | null;
    deniedAt: Date | null;
    denialReason: string | null;
    deniedBy: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    deliveredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  type WorkOrderServiceEntity = {
    id: number;
    workOrderId: number;
    serviceId: number;
    qty: number;
    unitPrice: Prisma.Decimal;
    total: Prisma.Decimal;
    createdAt: Date;
  };
  type WorkOrderPartEntity = {
    id: number;
    workOrderId: number;
    partId: number;
    qty: number;
    unitPrice: Prisma.Decimal;
    total: Prisma.Decimal;
    createdAt: Date;
  };

  const decimal = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);

  const customers = new Map<number, CustomerEntity>();
  const vehicles = new Map<number, VehicleEntity>();
  const services = new Map<number, ServiceEntity>();
  const parts = new Map<number, PartEntity>();
  const workOrders = new Map<number, WorkOrderEntity>();
  const workOrderServices = new Map<number, WorkOrderServiceEntity>();
  const workOrderParts = new Map<number, WorkOrderPartEntity>();

  const seq = {
    customer: 1,
    vehicle: 1,
    service: 1,
    part: 1,
    workOrder: 1,
    workOrderService: 1,
    workOrderPart: 1,
  };

  const prisma: any = {
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    },
    customer: {
      findUnique: async ({ where }: any) => customers.get(where.id) ?? null,
      findFirst: async ({ where }: any) => {
        for (const customer of customers.values()) {
          let match = true;
          if (where?.document !== undefined) match &&= customer.document === where.document;
          if (where?.NOT?.id !== undefined) match &&= customer.id !== where.NOT.id;
          if (match) return customer;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = seq.customer++;
        const entity: CustomerEntity = {
          id,
          name: data.name,
          document: data.document ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        customers.set(id, entity);
        return entity;
      },
      findMany: async () => Array.from(customers.values()),
      update: async ({ where, data }: any) => {
        const entity = customers.get(where.id)!;
        Object.assign(entity, data, { updatedAt: new Date() });
        return entity;
      },
    },
    vehicle: {
      findUnique: async ({ where }: any) => vehicles.get(where.id) ?? null,
      findFirst: async ({ where }: any) => {
        if (where?.plate) {
          return Array.from(vehicles.values()).find(v => v.plate === where.plate) ?? null;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = seq.vehicle++;
        const entity: VehicleEntity = {
          id,
          plate: data.plate,
          make: data.make,
          model: data.model,
          year: data.year ?? null,
          customerId: data.customerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        vehicles.set(id, entity);
        return entity;
      },
      findMany: async ({ where }: any = {}) => {
        if (where?.customerId !== undefined) {
          return Array.from(vehicles.values()).filter(v => v.customerId === where.customerId);
        }
        return Array.from(vehicles.values());
      },
      update: async ({ where, data }: any) => {
        const entity = vehicles.get(where.id)!;
        Object.assign(entity, data, { updatedAt: new Date() });
        return entity;
      },
    },
    serviceCatalog: {
      findUnique: async ({ where }: any) => {
        if (where.id !== undefined) return services.get(where.id) ?? null;
        if (where.code !== undefined) {
          return Array.from(services.values()).find(s => s.code === where.code) ?? null;
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        if (where?.code) {
          return (
            Array.from(services.values()).find(
              s => s.code === where.code && (!where.NOT || s.id !== where.NOT.id),
            ) ?? null
          );
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = seq.service++;
        const entity: ServiceEntity = {
          id,
          code: data.code,
          name: data.name,
          unitPrice: decimal(data.unitPrice),
          active: data.active ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        services.set(id, entity);
        return entity;
      },
      findMany: async ({ where }: any = {}) => {
        if (where?.id?.in) {
          return where.id.in.map((id: number) => services.get(id)).filter(Boolean);
        }
        return Array.from(services.values());
      },
      update: async ({ where, data }: any) => {
        const entity = services.get(where.id)!;
        if (data.code !== undefined) entity.code = data.code;
        if (data.name !== undefined) entity.name = data.name;
        if (data.unitPrice !== undefined) entity.unitPrice = decimal(data.unitPrice);
        if (data.active !== undefined) entity.active = data.active;
        entity.updatedAt = new Date();
        return entity;
      },
    },
    part: {
      findUnique: async ({ where }: any) => parts.get(where.id) ?? null,
      findFirst: async ({ where }: any) => {
        if (where?.sku) {
          return (
            Array.from(parts.values()).find(
              p => p.sku === where.sku && (!where.NOT || p.id !== where.NOT.id),
            ) ?? null
          );
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = seq.part++;
        const entity: PartEntity = {
          id,
          sku: data.sku,
          name: data.name,
          unitCost: decimal(data.unitCost),
          unitPrice: decimal(data.unitPrice),
          stockQty: data.stockQty ?? 0,
          active: data.active ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        parts.set(id, entity);
        return entity;
      },
      findMany: async ({ where }: any = {}) => {
        if (where?.id?.in) {
          return where.id.in.map((id: number) => parts.get(id)).filter(Boolean);
        }
        return Array.from(parts.values());
      },
      update: async ({ where, data }: any) => {
        const entity = parts.get(where.id)!;
        if (data.unitCost !== undefined) entity.unitCost = decimal(data.unitCost);
        if (data.unitPrice !== undefined) entity.unitPrice = decimal(data.unitPrice);
        if (data.stockQty) {
          if (data.stockQty.increment) entity.stockQty += data.stockQty.increment;
          if (data.stockQty.decrement) entity.stockQty -= data.stockQty.decrement;
          if (data.stockQty.set !== undefined) entity.stockQty = data.stockQty.set;
        }
        if (data.active !== undefined) entity.active = data.active;
        entity.updatedAt = new Date();
        return entity;
      },
    },
    workOrder: {
      create: async ({ data }: any) => {
        const id = seq.workOrder++;
        const entity: WorkOrderEntity = {
          id,
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          description: data.description,
          status: data.status ?? WorkOrderStatus.RECEIVED,
          subtotalServices: decimal(0),
          subtotalParts: decimal(0),
          discount: decimal(0),
          total: decimal(0),
          publicCode: randomUUID(),
          estimateSentAt: null,
          estimateSentBy: null,
          approvedAt: null,
          approvedBy: null,
          deniedAt: null,
          denialReason: null,
          deniedBy: null,
          startedAt: null,
          finishedAt: null,
          deliveredAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        workOrders.set(id, entity);
        return entity;
      },
      findUnique: async ({ where, include, select }: any) => {
        let entity: WorkOrderEntity | undefined;
        if (where?.id !== undefined) entity = workOrders.get(where.id);
        if (!entity && where?.publicCode) {
          entity = Array.from(workOrders.values()).find(w => w.publicCode === where.publicCode);
        }
        if (!entity) return null;
        if (select) {
          const result: any = {};
          for (const key of Object.keys(select)) {
            if (!select[key]) continue;
            if (key === 'vehicle') {
              const vehicle = vehicles.get(entity!.vehicleId);
              result.vehicle = vehicle
                ? { plate: vehicle.plate, make: vehicle.make, model: vehicle.model, year: vehicle.year }
                : null;
            } else {
              result[key] = (entity as any)[key];
            }
          }
          return result;
        }
        const base: any = { ...entity };
        if (include?.customer) base.customer = customers.get(entity.customerId) ?? null;
        if (include?.vehicle) base.vehicle = vehicles.get(entity.vehicleId) ?? null;
        if (include?.services)
          base.services = Array.from(workOrderServices.values()).filter(i => i.workOrderId === entity!.id);
        if (include?.parts)
          base.parts = Array.from(workOrderParts.values()).filter(i => i.workOrderId === entity!.id);
        return base;
      },
      findMany: async ({ where, include }: any = {}) => {
        let list = Array.from(workOrders.values());
        if (where?.status) {
          list = list.filter(w => w.status === where.status);
        }
        return list.map(w => {
          const base: any = { ...w };
          if (include?.customer) base.customer = customers.get(w.customerId) ?? null;
          if (include?.vehicle) base.vehicle = vehicles.get(w.vehicleId) ?? null;
          return base;
        });
      },
      update: async ({ where, data }: any) => {
        const entity = workOrders.get(where.id)!;
        Object.entries(data).forEach(([key, value]) => {
          if (value && typeof value === 'object' && 'set' in (value as any)) {
            (entity as any)[key] = (value as any).set;
          } else {
            (entity as any)[key] = value as any;
          }
        });
        entity.updatedAt = new Date();
        return { ...entity };
      },
      groupBy: async ({ by }: any) => {
        if (by.includes('status')) {
          const counts = new Map<WorkOrderStatus, number>();
          workOrders.forEach(order => {
            counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
          });
          return Array.from(counts.entries()).map(([status, count]) => ({ status, _count: { _all: count } }));
        }
        return [];
      },
      aggregate: async ({ _sum, where }: any) => {
        if (_sum?.total) {
          let list = Array.from(workOrders.values());
          if (where?.finishedAt?.gte) {
            list = list.filter(w => w.finishedAt && w.finishedAt >= where.finishedAt.gte);
          }
          if (where?.finishedAt?.lte) {
            list = list.filter(w => w.finishedAt && w.finishedAt <= where.finishedAt.lte);
          }
          const total = list.reduce((acc, w) => acc.add(w.total), decimal(0));
          return { _sum: { total } };
        }
        return { _sum: { total: decimal(0) } };
      },
    },
    workOrderService: {
      create: async ({ data }: any) => {
        const id = seq.workOrderService++;
        const entity: WorkOrderServiceEntity = {
          id,
          workOrderId: data.workOrderId,
          serviceId: data.serviceId,
          qty: data.qty,
          unitPrice: data.unitPrice instanceof Prisma.Decimal ? data.unitPrice : decimal(data.unitPrice),
          total: data.total instanceof Prisma.Decimal ? data.total : decimal(data.total),
          createdAt: new Date(),
        };
        workOrderServices.set(id, entity);
        return entity;
      },
      aggregate: async ({ where }: any) => {
        const list = Array.from(workOrderServices.values()).filter(i => i.workOrderId === where.workOrderId);
        const total = list.reduce((acc, item) => acc.add(item.total), decimal(0));
        return { _sum: { total } };
      },
      findUnique: async ({ where }: any) => workOrderServices.get(where.id) ?? null,
      delete: async ({ where }: any) => {
        workOrderServices.delete(where.id);
      },
      groupBy: async ({ by, take }: any) => {
        if (by.includes('serviceId')) {
          const groups = new Map<number, { total: Prisma.Decimal; qty: number }>();
          workOrderServices.forEach(item => {
            const entry = groups.get(item.serviceId) ?? { total: decimal(0), qty: 0 };
            entry.total = entry.total.add(item.total);
            entry.qty += item.qty;
            groups.set(item.serviceId, entry);
          });
          return Array.from(groups.entries())
            .map(([serviceId, agg]) => ({ serviceId, _sum: { total: agg.total, qty: agg.qty } }))
            .slice(0, take ?? groups.size);
        }
        return [];
      },
    },
    workOrderPart: {
      create: async ({ data }: any) => {
        const id = seq.workOrderPart++;
        const entity: WorkOrderPartEntity = {
          id,
          workOrderId: data.workOrderId,
          partId: data.partId,
          qty: data.qty,
          unitPrice: data.unitPrice instanceof Prisma.Decimal ? data.unitPrice : decimal(data.unitPrice),
          total: data.total instanceof Prisma.Decimal ? data.total : decimal(data.total),
          createdAt: new Date(),
        };
        workOrderParts.set(id, entity);
        return entity;
      },
      aggregate: async ({ where }: any) => {
        const list = Array.from(workOrderParts.values()).filter(i => i.workOrderId === where.workOrderId);
        const total = list.reduce((acc, item) => acc.add(item.total), decimal(0));
        return { _sum: { total } };
      },
      findUnique: async ({ where }: any) => workOrderParts.get(where.id) ?? null,
      delete: async ({ where }: any) => {
        workOrderParts.delete(where.id);
      },
      groupBy: async ({ by, take }: any) => {
        if (by.includes('partId')) {
          const groups = new Map<number, { total: Prisma.Decimal; qty: number }>();
          workOrderParts.forEach(item => {
            const entry = groups.get(item.partId) ?? { total: decimal(0), qty: 0 };
            entry.total = entry.total.add(item.total);
            entry.qty += item.qty;
            groups.set(item.partId, entry);
          });
          return Array.from(groups.entries())
            .map(([partId, agg]) => ({ partId, _sum: { total: agg.total, qty: agg.qty } }))
            .slice(0, take ?? groups.size);
        }
        return [];
      },
    },
  };

  return prisma;
}

describe('WorkOrdersService integration', () => {
  let prisma: any;
  let workOrders: WorkOrdersService;
  let partsService: PartsService;
  let servicesService: ServicesService;
  let customersService: CustomersService;
  let vehiclesService: VehiclesService;
  let metricsService: MetricsService;
  let notifier: { sendEstimate: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaStub();
    notifier = { sendEstimate: jest.fn().mockResolvedValue(undefined) };
    workOrders = new WorkOrdersService(prisma, notifier as unknown as BudgetNotifierService);
    partsService = new PartsService(prisma);
    servicesService = new ServicesService(prisma);
    customersService = new CustomersService(prisma);
    vehiclesService = new VehiclesService(prisma);
    metricsService = new MetricsService(prisma);
  });

  it('should run the work order happy path with status transitions', async () => {
    const customer = await customersService.create({ name: 'João', document: '12345678901' } as any);
    const vehicle = await vehiclesService.create({
      plate: 'ABC1234',
      make: 'Ford',
      model: 'Ka',
      year: 2020,
      customerId: customer.id,
    } as any);
    const service = await servicesService.create({ code: 'MNT_001', name: 'Troca de Óleo', unitPrice: '150.00' } as any);
    const part = await partsService.create({ sku: 'P01', name: 'Filtro', unitCost: '20.00', unitPrice: '50.00', stockQty: 5 } as any);

    const wo = await workOrders.create({ customerId: customer.id, vehicleId: vehicle.id, description: 'Revisão geral' });
    await workOrders.updateStatus(wo.id, { status: WorkOrderStatus.DIAGNOSING });

    await workOrders.addServiceItem(wo.id, { serviceId: service.id, qty: 1 });
    await workOrders.addPartItem(wo.id, { partId: part.id, qty: 2 });

    await workOrders.submitForApproval(wo.id, 'admin');
    expect(notifier.sendEstimate).toHaveBeenCalledWith(
      expect.objectContaining({ workOrderId: wo.id, requestedBy: 'admin' }),
    );

    await expect(workOrders.addPartItem(wo.id, { partId: part.id, qty: 1 })).rejects.toThrow('OS bloqueada');

    await workOrders.approveOrder(wo.id, 'admin');
    await workOrders.updateStatus(wo.id, { status: WorkOrderStatus.FINISHED });
    await workOrders.updateStatus(wo.id, { status: WorkOrderStatus.DELIVERED });

    const final = await workOrders.byId(wo.id);
    expect(final.status).toBe(WorkOrderStatus.DELIVERED);
    expect(final.total.toNumber()).toBe(150 + 2 * 50);

    const metrics = await metricsService.countByStatus();
    expect(metrics.find(m => m.status === WorkOrderStatus.DELIVERED)?.count).toBe(1);
  });

  it('should block insufficient stock when adding parts', async () => {
    const customer = await customersService.create({ name: 'Maria', document: '10987654321' } as any);
    const vehicle = await vehiclesService.create({
      plate: 'XYZ1A23',
      make: 'VW',
      model: 'Gol',
      year: 2019,
      customerId: customer.id,
    } as any);
    await partsService.create({ sku: 'P99', name: 'Pastilha', unitCost: '10', unitPrice: '30', stockQty: 1 } as any);
    await servicesService.create({ code: 'SRV', name: 'Serviço', unitPrice: '80' } as any);
    const wo = await workOrders.create({ customerId: customer.id, vehicleId: vehicle.id, description: 'Frenagem' });
    await workOrders.updateStatus(wo.id, { status: WorkOrderStatus.DIAGNOSING });
    await expect(workOrders.addPartItem(wo.id, { partId: 1, qty: 3 })).rejects.toThrow('Estoque insuficiente');
  });

  it('prevents skipping status transitions', async () => {
    const customer = await customersService.create({ name: 'Leo', document: '22233344455' } as any);
    const vehicle = await vehiclesService.create({
      plate: 'JKL4B56',
      make: 'Fiat',
      model: 'Argo',
      year: 2021,
      customerId: customer.id,
    } as any);
    const wo = await workOrders.create({ customerId: customer.id, vehicleId: vehicle.id, description: 'Diagnóstico' });
    await expect(workOrders.updateStatus(wo.id, { status: WorkOrderStatus.FINISHED })).rejects.toThrow('Transição inválida');
  });

  it('does not submit for approval if not diagnosing', async () => {
    const customer = await customersService.create({ name: 'Ana', document: '99988877766' } as any);
    const vehicle = await vehiclesService.create({
      plate: 'MNO7C89',
      make: 'Toyota',
      model: 'Corolla',
      year: 2018,
      customerId: customer.id,
    } as any);
    const wo = await workOrders.create({ customerId: customer.id, vehicleId: vehicle.id, description: 'Alinhamento' });
    await expect(workOrders.submitForApproval(wo.id, 'admin')).rejects.toThrow('Só é possível enviar para aprovação');
  });

  it('permite negar orçamento e limpa dados de aprovação', async () => {
    const customer = await customersService.create({ name: 'Bruno', document: '55544433322' } as any);
    const vehicle = await vehiclesService.create({
      plate: 'PRS8D76',
      make: 'Chevrolet',
      model: 'Onix',
      year: 2022,
      customerId: customer.id,
    } as any);
    const wo = await workOrders.create({ customerId: customer.id, vehicleId: vehicle.id, description: 'Orçamento' });
    await workOrders.updateStatus(wo.id, { status: WorkOrderStatus.DIAGNOSING });
    await workOrders.submitForApproval(wo.id, 'admin');
    const denied = await workOrders.denyOrder(wo.id, 'Cliente não aprovou', 'admin');
    expect(denied.status).toBe(WorkOrderStatus.DIAGNOSING);
    expect(denied.denialReason).toBe('Cliente não aprovou');
  });

  it('publica dados seguros via código público', async () => {
    const customer = await customersService.create({ name: 'Clara', document: '11122233344' } as any);
    const vehicle = await vehiclesService.create({
      plate: 'QRS1E23',
      make: 'Honda',
      model: 'Civic',
      year: 2017,
      customerId: customer.id,
    } as any);
    const service = await servicesService.create({ code: 'REV', name: 'Revisão', unitPrice: '100' } as any);
    const part = await partsService.create({ sku: 'PT1', name: 'Filtro de ar', unitCost: '10', unitPrice: '25', stockQty: 3 } as any);
    const wo = await workOrders.create({ customerId: customer.id, vehicleId: vehicle.id, description: 'Revisão anual' });
    await workOrders.updateStatus(wo.id, { status: WorkOrderStatus.DIAGNOSING });
    await workOrders.addServiceItem(wo.id, { serviceId: service.id, qty: 1 });
    await workOrders.addPartItem(wo.id, { partId: part.id, qty: 1 });
    const stored = await workOrders.byId(wo.id);
    const summary = await workOrders.publicByCode(stored.publicCode);
    expect(summary.status).toBe(stored.status);
    expect(summary.vehicle).toMatchObject({ plate: vehicle.plate, make: vehicle.make });
  });

  it('remove itens e devolve estoque', async () => {
    const customer = await customersService.create({ name: 'Pedro', document: '33322211100' } as any);
    const vehicle = await vehiclesService.create({
      plate: 'TUV4F56',
      make: 'Ford',
      model: 'Focus',
      year: 2016,
      customerId: customer.id,
    } as any);
    const part = await partsService.create({ sku: 'PT2', name: 'Correia', unitCost: '15', unitPrice: '40', stockQty: 2 } as any);
    const wo = await workOrders.create({ customerId: customer.id, vehicleId: vehicle.id, description: 'Troca' });
    await workOrders.updateStatus(wo.id, { status: WorkOrderStatus.DIAGNOSING });
    const withPart = await workOrders.addPartItem(wo.id, { partId: part.id, qty: 1 });
    const partItemId = withPart.parts[0].id;
    await workOrders.removePartItem(partItemId);
    const refreshedPart = await partsService.byId(part.id);
    expect(refreshedPart.stockQty).toBe(2);
  });

  it('não cria OS se veículo não pertence ao cliente', async () => {
    const customer = await customersService.create({ name: 'Sara', document: '44455566677' } as any);
    const other = await customersService.create({ name: 'Outro', document: '77766655544' } as any);
    const vehicle = await vehiclesService.create({
      plate: 'UVX9G88',
      make: 'Kia',
      model: 'Soul',
      year: 2015,
      customerId: other.id,
    } as any);
    await expect(
      workOrders.create({ customerId: customer.id, vehicleId: vehicle.id, description: 'Inválido' }),
    ).rejects.toThrow('Veículo não pertence ao cliente informado');
  });
});
