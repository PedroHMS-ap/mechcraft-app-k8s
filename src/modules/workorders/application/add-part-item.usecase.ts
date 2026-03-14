import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';

@Injectable()
export class AddPartItemUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  async execute(workOrderId: number, partId: number, qty: number) {
    const part = await this.repo.getPartById(partId);
    if (!part || !part.active) throw new BadRequestException('Peça inválida');
    if (part.stockQty < qty) throw new BadRequestException('Estoque insuficiente');
    const unitPrice = part.unitPrice;
    const total = (Number(unitPrice) * qty).toString();
    await this.repo.addPartItem(workOrderId, { partId, qty, unitPrice, total });
    return;
  }
}
