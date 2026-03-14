import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../domain/workorder.repository';
import { WorkOrderStatus } from '../domain/entities';

export interface ApproveViaWebhookRequest {
  publicCode: string; // Identificação única da OS (público)
  action: 'APPROVE' | 'DENY'; // Ação do webhook
  reason?: string; // Motivo de recusa (opcional, para DENY)
  externalId?: string; // ID externo do sistema que notifica (para rastreamento)
}

@Injectable()
export class ApproveViaWebhookUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  async execute(request: ApproveViaWebhookRequest): Promise<any> {
    // Validar entrada
    if (!request.publicCode) {
      throw new BadRequestException('publicCode é obrigatório');
    }

    if (!request.action || !['APPROVE', 'DENY'].includes(request.action)) {
      throw new BadRequestException('action deve ser APPROVE ou DENY');
    }

    // Buscar ordem pelo código público
    const order: any = await this.repo.findByPublicCode(request.publicCode);
    if (!order) {
      throw new NotFoundException(`OS com código ${request.publicCode} não encontrada`);
    }

    // Validar estado atual
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
      return this.repo.updateStatus(order.id, WorkOrderStatus.IN_PROGRESS, meta);
    }

    // Processar recusa
    if (request.action === 'DENY') {
      const meta = {
        deniedAt: new Date(),
        denialReason: request.reason || 'Recusado externamente',
      };
      return this.repo.updateStatus(order.id, WorkOrderStatus.DIAGNOSING, meta);
    }
  }
}
