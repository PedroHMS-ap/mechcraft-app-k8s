import { Prisma, WorkOrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

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

export class InMemoryPrismaService {
  private customers = new Map<number, CustomerEntity>();
  private vehicles = new Map<number, VehicleEntity>();
  private services = new Map<number, ServiceEntity>();
  private parts = new Map<number, PartEntity>();
  private workOrders = new Map<number, WorkOrderEntity>();
  private workOrderServices = new Map<number, WorkOrderServiceEntity>();
  private workOrderParts = new Map<number, WorkOrderPartEntity>();

  private counters: Record<string, number> = {
    customer: 1,
    vehicle: 1,
    service: 1,
    part: 1,
    workOrder: 1,
    workOrderService: 1,
    workOrderPart: 1,
  };

  private nextId(key: keyof InMemoryPrismaService['counters']) {
    const value = this.counters[key];
    this.counters[key] = value + 1;
    return value;
  }

  customer = {
    findUnique: async: any => {},
  };
}
