import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';
import { BudgetNotifierService } from '@/common/notifications/budget-notifier.service';
import { WorkOrderStatus } from '../domain/entities';

@Injectable()
export class SubmitForApprovalUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository, private notifier: BudgetNotifierService) {}

  async execute(id: number, requestedBy: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('OS não encontrada');
    if (order.status !== WorkOrderStatus.DIAGNOSING) throw new BadRequestException('Só é possível enviar para aprovação após diagnóstico');

    // send estimate via existing notifier
    await this.notifier.sendEstimate({ workOrderId: order.id, customer: { id: order.customerId }, requestedBy } as any);

    return this.repo.updateStatus(id, WorkOrderStatus.WAITING_APPROVAL);
  }
}
