import { Injectable, Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';

@Injectable()
export class RemoveServiceItemUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  async execute(itemId: number) {
    // Verify item exists via repo wrapper methods (adapter will throw if not found)
    await this.repo.removeServiceItem(itemId);
    return;
  }
}
