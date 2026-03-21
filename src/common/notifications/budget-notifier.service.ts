import { Injectable, Logger } from '@nestjs/common';
import { recordCustomEvent } from '../observability/newrelic';

interface BudgetNotificationPayload {
  workOrderId: number;
  customer: { name: string; email?: string | null } | null;
  requestedBy: string;
}

@Injectable()
export class BudgetNotifierService {
  private readonly logger = new Logger(BudgetNotifierService.name);

  async sendEstimate(payload: BudgetNotificationPayload) {
    const eventPayload = {
      event: 'workorder.estimate_sent',
      workOrderId: payload.workOrderId,
      customerEmail: payload.customer?.email ?? null,
      requestedBy: payload.requestedBy,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(JSON.stringify(eventPayload));
    recordCustomEvent('WorkOrderIntegrationProcessed', {
      channel: 'budget_notification',
      workOrderId: payload.workOrderId,
      requestedBy: payload.requestedBy,
      customerEmailPresent: Boolean(payload.customer?.email),
    });
  }
}
