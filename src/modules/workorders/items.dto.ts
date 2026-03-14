import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddServiceItemDto {
  @IsInt() @Min(1) serviceId!: number;
  @IsInt() @Min(1) qty!: number;
}

export class AddPartItemDto {
  @IsInt() @Min(1) partId!: number;
  @IsInt() @Min(1) qty!: number;
}
