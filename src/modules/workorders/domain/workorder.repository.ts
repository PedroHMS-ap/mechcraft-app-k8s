import { WorkOrder, WorkOrderId, WorkOrderStatus } from './entities';

export interface CreateWorkOrderServiceItem {
  serviceId: number;
  qty: number;
  unitPrice: string;
  total: string;
}

export interface CreateWorkOrderPartItem {
  partId: number;
  qty: number;
  unitPrice: string;
  total: string;
}

export interface CreateWorkOrderData {
  customerId: number;
  vehicleId: number;
  description?: string;
  serviceItems?: CreateWorkOrderServiceItem[];
  partItems?: CreateWorkOrderPartItem[];
}

export interface WorkOrderRepository {
  create(data: CreateWorkOrderData): Promise<WorkOrder>;
  findById(id: WorkOrderId): Promise<WorkOrder | null>;
  findByPublicCode(code: string): Promise<WorkOrder | null>;
  listByCustomer(customerId: number): Promise<WorkOrder[]>;
  findByPublicCodeForCustomer(code: string, customerId: number): Promise<WorkOrder | null>;
  updateStatus(id: WorkOrderId, status: WorkOrderStatus, meta?: any): Promise<WorkOrder>;
  list(status?: WorkOrderStatus): Promise<WorkOrder[]>;
  addServiceItem(workOrderId: number, item: { serviceId: number; qty: number; unitPrice: string; total: string }): Promise<any>;
  addPartItem(workOrderId: number, item: { partId: number; qty: number; unitPrice: string; total: string }): Promise<any>;
  removeServiceItem(itemId: number): Promise<any>;
  removePartItem(itemId: number): Promise<any>;
  getServiceById(serviceId: number): Promise<{ id: number; unitPrice: string; active: boolean } | null>;
  getPartById(partId: number): Promise<{ id: number; unitPrice: string; active: boolean; stockQty: number } | null>;
}
