import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class DenyWorkOrderDto {
  @ApiProperty({ example: 'Cliente não aprovou o valor do serviço' })
  @IsString()
  @IsNotEmpty()
  reason: string
}
