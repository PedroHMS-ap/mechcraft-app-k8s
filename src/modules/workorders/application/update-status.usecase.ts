import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';
import { WorkOrderStatus } from '../domain/entities';

@Injectable()
export class UpdateStatusUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  private transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    [WorkOrderStatus.RECEIVED]: [WorkOrderStatus.DIAGNOSING],
    [WorkOrderStatus.DIAGNOSING]: [WorkOrderStatus.WAITING_APPROVAL],
    [WorkOrderStatus.WAITING_APPROVAL]: [WorkOrderStatus.IN_PROGRESS],
    [WorkOrderStatus.IN_PROGRESS]: [WorkOrderStatus.FINISHED],
    [WorkOrderStatus.FINISHED]: [WorkOrderStatus.DELIVERED],
    [WorkOrderStatus.DELIVERED]: [],
  } as any;

  async execute(id: number, newStatus: WorkOrderStatus) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('Ordem não encontrada');

    const allowed = this.transitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`Transição inválida: não é permitido ir de ${order.status} para ${newStatus}`);
    }

    // Repo will update timestamps if needed in infra; here we just update status
    return this.repo.updateStatus(id, newStatus as any);
  }
}
