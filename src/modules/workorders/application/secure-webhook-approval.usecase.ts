import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';
import { WorkOrderStatus } from '../domain/entities';
import { WebhookApprovalRequestDto } from '../dto/webhook-approval-request.dto';

/**
 * Use-case para aprovação/recusa de OS via webhook externo.
 * 
 * Características de segurança:
 * 1. Validação de token (via header X-Webhook-Token, validado no controller).
 * 2. Uso de publicCode em vez de ID interno para identificar OS.
 * 3. Idempotência: verifica se a ação já foi realizada (externalId ou idempotencyKey).
 * 4. Transição de estado segura: apenas aprova quando status é WAITING_APPROVAL.
 */
@Injectable()
export class SecureWebhookApprovalUseCase {
  // In-memory cache para rastrear requisições processadas (em produção, usar Redis/BD)
  private processedRequests = new Map<string, any>();

  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  async execute(request: WebhookApprovalRequestDto, tokenValid: boolean): Promise<any> {
    // Validar token
    if (!tokenValid) {
      throw new UnauthorizedException('Token de webhook inválido ou ausente');
    }

    // Validar entrada
    if (!request.publicCode) {
      throw new BadRequestException('publicCode é obrigatório');
    }

    if (!request.action || !['APPROVE', 'DENY'].includes(request.action)) {
      throw new BadRequestException('action deve ser APPROVE ou DENY');
    }

    // Verificar idempotência: se a requisição já foi processada, retornar resultado anterior
    const idempotencyKey = request.idempotencyKey || request.externalId || `${request.publicCode}-${request.action}`;
    if (idempotencyKey && this.processedRequests.has(idempotencyKey)) {
      return this.processedRequests.get(idempotencyKey);
    }

    // Buscar ordem pelo código público
    const order: any = await this.repo.findByPublicCode(request.publicCode);
    if (!order) {
      throw new NotFoundException(`OS com código ${request.publicCode} não encontrada`);
    }

    // Verificar se já foi aprovada/recusada anteriormente
    if (request.action === 'APPROVE' && order.status === WorkOrderStatus.IN_PROGRESS) {
      // Já aprovada: retornar idempotentemente
      const result = { id: order.id, status: order.status, message: 'OS já estava aprovada' };
      if (idempotencyKey) this.processedRequests.set(idempotencyKey, result);
      return result;
    }

    if (request.action === 'DENY' && order.status === WorkOrderStatus.DIAGNOSING && order.deniedAt) {
      // Já recusada: retornar idempotentemente
      const result = { id: order.id, status: order.status, message: 'OS já estava recusada' };
      if (idempotencyKey) this.processedRequests.set(idempotencyKey, result);
      return result;
    }

    // Validar estado: deve estar aguardando aprovação
    if (order.status !== WorkOrderStatus.WAITING_APPROVAL) {
      throw new BadRequestException(
        `OS não está aguardando aprovação. Status atual: ${order.status}`,
      );
    }

    // Processar aprovação
    if (request.action === 'APPROVE') {
      const meta = {
        approvedAt: new Date(),
        approvedBy: `webhook-${request.externalId || 'external'}`,
      };
      const result = await this.repo.updateStatus(order.id, WorkOrderStatus.IN_PROGRESS, meta);
      if (idempotencyKey) this.processedRequests.set(idempotencyKey, result);
      return result;
    }

    // Processar recusa
    if (request.action === 'DENY') {
      const meta = {
        deniedAt: new Date(),
        denialReason: request.reason || 'Recusado externamente',
        deniedBy: `webhook-${request.externalId || 'external'}`,
      };
      const result = await this.repo.updateStatus(order.id, WorkOrderStatus.DIAGNOSING, meta);
      if (idempotencyKey) this.processedRequests.set(idempotencyKey, result);
      return result;
    }
  }
}
