import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';

export enum WebhookAction {
  APPROVE = 'APPROVE',
  DENY = 'DENY',
}

export class ApproveViaWebhookDto {
  @IsString()
  @MinLength(1)
  publicCode: string;

  @IsEnum(WebhookAction)
  action: WebhookAction;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}
