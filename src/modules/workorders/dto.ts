import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkOrderStatus } from '@prisma/client';

class CreateWorkOrderServiceItemDto {
  @IsInt() @Min(1)
  serviceId!: number;

  @IsInt() @Min(1)
  qty!: number;
}

class CreateWorkOrderPartItemDto {
  @IsInt() @Min(1)
  partId!: number;

  @IsInt() @Min(1)
  qty!: number;
}

export class CreateWorkOrderDto {
  @IsInt() @Min(1)
  customerId!: number;

  @IsInt() @Min(1)
  vehicleId!: number;

  @IsString() @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderServiceItemDto)
  services?: CreateWorkOrderServiceItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderPartItemDto)
  parts?: CreateWorkOrderPartItemDto[];
}

export class UpdateWorkOrderStatusDto {
  @IsEnum(WorkOrderStatus)
  status!: WorkOrderStatus;
}
