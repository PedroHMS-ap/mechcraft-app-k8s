import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { recordCustomEvent } from '@/common/observability/newrelic';

@Injectable()
export class WebhookTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-webhook-token'];
    const expectedToken = process.env.EXTERNAL_SERVICE_TOKEN;

    if (!token || !expectedToken || token !== expectedToken) {
      recordCustomEvent('WorkOrderIntegrationFailure', {
        channel: 'webhook',
        flow: 'secure-approval',
        failureType: 'invalid_token',
        path: request.originalUrl ?? request.url ?? '/workorders/webhook/secure-approve',
      });
      throw new UnauthorizedException('Token de webhook invalido ou ausente');
    }

    (request as any).webhookTokenValid = true;
    return true;
  }
}
