import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { IsNonNegativeDecimalString } from '@/common/validators';

export class CreateServiceDto {
  @IsString() @IsNotEmpty()
  @Matches(/^[A-Z0-9_\-]+$/, { message: 'code deve ser MAIÚSCULO, números, _, -' })
  code!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  // Aceita string numérica para facilitar no Swagger
  @IsNonNegativeDecimalString()
  unitPrice!: string;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdateServiceDto {
  @IsOptional() @Matches(/^[A-Z0-9_\-]+$/)
  code?: string;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsNonNegativeDecimalString()
  unitPrice?: string;

  @IsOptional() @IsBoolean()
  active?: boolean;
}
