import { IsEnum, IsString } from 'class-validator';
import { WorkOrderStatus } from '../domain/entities';

export class EmailStatusUpdateDto {
  @IsString()
  publicCode: string;

  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;
}
