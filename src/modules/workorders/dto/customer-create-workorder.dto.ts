import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerCreateWorkOrderServiceItemDto {
  @IsInt()
  @Min(1)
  serviceId!: number;

  @IsInt()
  @Min(1)
  qty!: number;
}

class CustomerCreateWorkOrderPartItemDto {
  @IsInt()
  @Min(1)
  partId!: number;

  @IsInt()
  @Min(1)
  qty!: number;
}

export class CustomerCreateWorkOrderDto {
  @IsInt()
  @Min(1)
  vehicleId!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerCreateWorkOrderServiceItemDto)
  services?: CustomerCreateWorkOrderServiceItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerCreateWorkOrderPartItemDto)
  parts?: CustomerCreateWorkOrderPartItemDto[];
}

