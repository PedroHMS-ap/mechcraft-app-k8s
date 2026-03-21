import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { noticeError, recordCustomEvent } from '@/common/observability/newrelic';
import { WorkOrderStatus } from '../domain/entities';
import { WorkOrderRepository } from '../domain/workorder.repository';

export interface ApproveViaWebhookRequest {
  publicCode: string;
  action: 'APPROVE' | 'DENY';
  reason?: string;
  externalId?: string;
}

@Injectable()
export class ApproveViaWebhookUseCase {
  constructor(@Inject('WorkOrderRepository') private repo: WorkOrderRepository) {}

  async execute(request: ApproveViaWebhookRequest): Promise<any> {
    try {
      if (!request.publicCode) {
        throw new BadRequestException('publicCode e obrigatorio');
      }

      if (!request.action || !['APPROVE', 'DENY'].includes(request.action)) {
        throw new BadRequestException('action deve ser APPROVE ou DENY');
      }

      const order: any = await this.repo.findByPublicCode(request.publicCode);
      if (!order) {
        throw new NotFoundException(`OS com codigo ${request.publicCode} nao encontrada`);
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
        recordCustomEvent('WorkOrderIntegrationProcessed', {
          channel: 'webhook',
          flow: 'legacy-approval',
          action: request.action,
          workOrderId: order.id,
          publicCode: request.publicCode,
          resultStatus: WorkOrderStatus.IN_PROGRESS,
        });
        return result;
      }

      const result = await this.repo.updateStatus(order.id, WorkOrderStatus.DIAGNOSING, {
        deniedAt: new Date(),
        denialReason: request.reason || 'Recusado externamente',
      });
      recordCustomEvent('WorkOrderIntegrationProcessed', {
        channel: 'webhook',
        flow: 'legacy-approval',
        action: request.action,
        workOrderId: order.id,
        publicCode: request.publicCode,
        resultStatus: WorkOrderStatus.DIAGNOSING,
      });
      return result;
    } catch (error) {
      noticeError(error, {
        channel: 'webhook',
        flow: 'legacy-approval',
        action: request.action ?? null,
        publicCode: request.publicCode ?? null,
      });
      recordCustomEvent('WorkOrderIntegrationFailure', {
        channel: 'webhook',
        flow: 'legacy-approval',
        action: request.action ?? null,
        publicCode: request.publicCode ?? null,
        failureType: error instanceof Error ? error.name : 'UnknownError',
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
      throw error;
    }
  }
}
