import { Injectable, Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';
import { WorkOrderStatus } from '../domain/entities';

@Injectable()
export class ListWorkOrdersUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  private priority(status: WorkOrderStatus) {
    const map: Record<WorkOrderStatus, number> = {
      [WorkOrderStatus.IN_PROGRESS]: 1,
      [WorkOrderStatus.WAITING_APPROVAL]: 2,
      [WorkOrderStatus.DIAGNOSING]: 3,
      [WorkOrderStatus.RECEIVED]: 4,
      [WorkOrderStatus.FINISHED]: 5,
      [WorkOrderStatus.DELIVERED]: 6,
    } as any;
    return map[status] ?? 99;
  }

  async execute(filterStatus?: WorkOrderStatus) {
    // fetch and then order in-memory by priority + createdAt asc
    const rows = await this.repo.list(filterStatus as any);

    const filtered = rows.filter(r => {
      if (!filterStatus) return r.status !== WorkOrderStatus.FINISHED && r.status !== WorkOrderStatus.DELIVERED;
      return r.status === filterStatus;
    });

    filtered.sort((a: any, b: any) => {
      const p = this.priority(a.status) - this.priority(b.status);
      if (p !== 0) return p;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return filtered;
  }
}
