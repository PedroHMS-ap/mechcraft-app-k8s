import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { noticeError, recordCustomEvent } from '@/common/observability/newrelic';
import { WorkOrderStatus } from '../domain/entities';
import { WorkOrderRepository } from '../domain/workorder.repository';
import { WebhookApprovalRequestDto } from '../dto/webhook-approval-request.dto';

@Injectable()
export class SecureWebhookApprovalUseCase {
  private processedRequests = new Map<string, any>();

  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  async execute(request: WebhookApprovalRequestDto, tokenValid: boolean): Promise<any> {
    const idempotencyKey =
      request.idempotencyKey || request.externalId || `${request.publicCode}-${request.action}`;

    try {
      if (!tokenValid) {
        throw new UnauthorizedException('Token de webhook invalido ou ausente');
      }

      if (!request.publicCode) {
        throw new BadRequestException('publicCode e obrigatorio');
      }

      if (!request.action || !['APPROVE', 'DENY'].includes(request.action)) {
        throw new BadRequestException('action deve ser APPROVE ou DENY');
      }

      if (idempotencyKey && this.processedRequests.has(idempotencyKey)) {
        const previousResult = this.processedRequests.get(idempotencyKey);
        recordCustomEvent('WorkOrderIntegrationProcessed', {
          channel: 'webhook',
          flow: 'secure-approval',
          action: request.action,
          publicCode: request.publicCode,
          idempotent: true,
        });
        return previousResult;
      }

      const order: any = await this.repo.findByPublicCode(request.publicCode);
      if (!order) {
        throw new NotFoundException(`OS com codigo ${request.publicCode} nao encontrada`);
      }

      if (request.action === 'APPROVE' && order.status === WorkOrderStatus.IN_PROGRESS) {
        const result = { id: order.id, status: order.status, message: 'OS j\u00e1 estava aprovada' };
        if (idempotencyKey) this.processedRequests.set(idempotencyKey, result);
        recordCustomEvent('WorkOrderIntegrationProcessed', {
          channel: 'webhook',
          flow: 'secure-approval',
          action: request.action,
          workOrderId: order.id,
          publicCode: request.publicCode,
          resultStatus: order.status,
          idempotent: true,
        });
        return result;
      }

      if (request.action === 'DENY' && order.status === WorkOrderStatus.DIAGNOSING && order.deniedAt) {
        const result = { id: order.id, status: order.status, message: 'OS j\u00e1 estava recusada' };
        if (idempotencyKey) this.processedRequests.set(idempotencyKey, result);
        recordCustomEvent('WorkOrderIntegrationProcessed', {
          channel: 'webhook',
          flow: 'secure-approval',
          action: request.action,
          workOrderId: order.id,
          publicCode: request.publicCode,
          resultStatus: order.status,
          idempotent: true,
        });
        return result;
      }

      if (order.status !== WorkOrderStatus.WAITING_APPROVAL) {
        throw new BadRequestException(
          `OS nao esta aguardando aprovacao. Status atual: ${order.status}`,
        );
      }

      if (request.action === 'APPROVE') {
        const result = await this.repo.updateStatus(order.id, WorkOrderStatus.IN_PROGRESS, {
          approvedAt: new Date(),
          approvedBy: `webhook-${request.externalId || 'external'}`,
        });
        if (idempotencyKey) this.processedRequests.set(idempotencyKey, result);
        recordCustomEvent('WorkOrderIntegrationProcessed', {
          channel: 'webhook',
          flow: 'secure-approval',
          action: request.action,
          workOrderId: order.id,
          publicCode: request.publicCode,
          resultStatus: WorkOrderStatus.IN_PROGRESS,
          idempotent: false,
        });
        return result;
      }

      const result = await this.repo.updateStatus(order.id, WorkOrderStatus.DIAGNOSING, {
        deniedAt: new Date(),
        denialReason: request.reason || 'Recusado externamente',
        deniedBy: `webhook-${request.externalId || 'external'}`,
      });
      if (idempotencyKey) this.processedRequests.set(idempotencyKey, result);
      recordCustomEvent('WorkOrderIntegrationProcessed', {
        channel: 'webhook',
        flow: 'secure-approval',
        action: request.action,
        workOrderId: order.id,
        publicCode: request.publicCode,
        resultStatus: WorkOrderStatus.DIAGNOSING,
        idempotent: false,
      });
      return result;
    } catch (error) {
      noticeError(error, {
        channel: 'webhook',
        flow: 'secure-approval',
        action: request.action ?? null,
        publicCode: request.publicCode ?? null,
        idempotencyKey,
      });
      recordCustomEvent('WorkOrderIntegrationFailure', {
        channel: 'webhook',
        flow: 'secure-approval',
        action: request.action ?? null,
        publicCode: request.publicCode ?? null,
        failureType: error instanceof Error ? error.name : 'UnknownError',
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
      throw error;
    }
  }
}
