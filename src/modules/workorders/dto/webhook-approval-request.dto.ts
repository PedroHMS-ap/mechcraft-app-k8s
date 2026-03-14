import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum WebhookApprovalAction {
  APPROVE = 'APPROVE',
  DENY = 'DENY',
}

/**
 * DTO para requisições de aprovação/recusa via webhook.
 * 
 * Segurança:
 * - publicCode identifica a OS publicamente (sem exposição de ID interno).
 * - token deve ser passado via header X-Webhook-Token (validado no controller).
 * - externalId e idempotencyKey ajudam a rastrear e evitar duplicatas.
 */
export class WebhookApprovalRequestDto {
  @IsString()
  publicCode: string; // Código público da OS

  @IsEnum(WebhookApprovalAction)
  action: WebhookApprovalAction; // APPROVE ou DENY

  @IsOptional()
  @IsString()
  reason?: string; // Motivo de recusa (para DENY)

  @IsOptional()
  @IsString()
  externalId?: string; // ID da requisição no sistema externo (rastreamento)

  @IsOptional()
  @IsString()
  idempotencyKey?: string; // Chave de idempotência (para evitar duplicatas)
}
