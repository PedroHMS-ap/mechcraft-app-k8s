import { Injectable, Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';

@Injectable()
export class RemovePartItemUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  async execute(itemId: number) {
    await this.repo.removePartItem(itemId);
    return;
  }
}
