import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';

@Injectable()
export class AddServiceItemUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  async execute(workOrderId: number, serviceId: number, qty: number) {
    const svc = await this.repo.getServiceById(serviceId);
    if (!svc || !svc.active) throw new BadRequestException('Serviço inválido');
    const unitPrice = svc.unitPrice;
    // total as string for repository contract
    const total = (Number(unitPrice) * qty).toString();
    await this.repo.addServiceItem(workOrderId, { serviceId, qty, unitPrice, total });
    return;
  }
}
