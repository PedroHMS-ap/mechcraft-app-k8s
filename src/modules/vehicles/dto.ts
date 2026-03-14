// src/modules/vehicles/dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsPlate } from '@/common/validators';

const normalizePlate = (value: string) => value.replace(/-/g, '').toUpperCase();

export class CreateVehicleDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizePlate(value) : value))
  @IsPlate()
  plate!: string;

  @IsString() @IsNotEmpty()
  make!: string;

  @IsString() @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsInt() @Min(1900)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  year?: number;

  @IsInt() @Min(1)
  @Transform(({ value }) => Number(value))
  customerId!: number;
}

export class UpdateVehicleDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? normalizePlate(value) : value))
  @IsPlate()
  plate?: string;

  @IsOptional() @IsString()
  make?: string;

  @IsOptional() @IsString()
  model?: string;

  @IsOptional()
  @IsInt() @Min(1900)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  year?: number;
}
