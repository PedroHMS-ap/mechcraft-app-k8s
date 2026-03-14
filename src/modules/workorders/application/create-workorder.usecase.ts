import { Injectable, BadRequestException } from '@nestjs/common';
import { WorkOrdersService } from '../workorders.service';
import { CreateWorkOrderDto } from '../dto';

@Injectable()
export class CreateWorkOrderUseCase {
  constructor(private workOrdersService: WorkOrdersService) {}

  async execute(input: CreateWorkOrderDto) {
    if (!input.customerId || !input.vehicleId) {
      throw new BadRequestException('Cliente e veÇðculo sÇœo obrigatÇürios');
    }
    return this.workOrdersService.create(input);
  }
}
