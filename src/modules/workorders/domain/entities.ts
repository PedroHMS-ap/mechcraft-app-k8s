export type Money = string; // Prisma Decimal serialized as string in DTOs

export type WorkOrderId = number;

export enum WorkOrderStatus {
  RECEIVED = 'RECEIVED',
  DIAGNOSING = 'DIAGNOSING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  DELIVERED = 'DELIVERED',
}

export interface WorkOrder {
  id: WorkOrderId;
  publicCode: string;
  status: WorkOrderStatus;
  description?: string | null;
  customerId: number;
  vehicleId: number;
  createdAt: Date;
  updatedAt: Date;
  // Aggregates stored on the workOrder table (Prisma Decimal)
  subtotalServices?: any;
  subtotalParts?: any;
  discount?: any;
  total?: any; // Prisma.Decimal with toNumber() used in tests
  // Approval/denial metadata
  deniedAt?: Date | null;
  denialReason?: string | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  // Relations that tests may expect
  services?: any[];
  parts?: any[];
  customer?: any;
  vehicle?: any;
}
