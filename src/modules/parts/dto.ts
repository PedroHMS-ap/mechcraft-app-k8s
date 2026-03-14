import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';
import { IsNonNegativeDecimalString } from '@/common/validators';

export class CreatePartDto {
  @IsString() @IsNotEmpty()
  @Matches(/^[A-Z0-9_\-]+$/)
  sku!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsNonNegativeDecimalString()
  unitCost!: string;

  @IsNonNegativeDecimalString()
  unitPrice!: string;

  @IsOptional() @IsInt() @Min(0)
  stockQty?: number;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdatePartDto {
  @IsOptional() @Matches(/^[A-Z0-9_\-]+$/)
  sku?: string;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsNonNegativeDecimalString()
  unitCost?: string;

  @IsOptional() @IsNonNegativeDecimalString()
  unitPrice?: string;

  @IsOptional() @IsInt() @Min(0)
  stockQty?: number;

  @IsOptional() @IsBoolean()
  active?: boolean;
}
