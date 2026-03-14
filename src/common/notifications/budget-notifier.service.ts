import { Injectable, Logger } from '@nestjs/common';

interface BudgetNotificationPayload {
  workOrderId: number;
  customer: { name: string; email?: string | null } | null;
  requestedBy: string;
}

@Injectable()
export class BudgetNotifierService {
  private readonly logger = new Logger(BudgetNotifierService.name);

  async sendEstimate(payload: BudgetNotificationPayload) {
    this.logger.log(
      JSON.stringify({
        event: 'workorder.estimate_sent',
        workOrderId: payload.workOrderId,
        customerEmail: payload.customer?.email ?? null,
        requestedBy: payload.requestedBy,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
