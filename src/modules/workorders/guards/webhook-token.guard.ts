import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Guard para validar token de webhook.
 * 
 * Espera header X-Webhook-Token com valor que corresponde a EXTERNAL_SERVICE_TOKEN.
 * Em produção, usar HMAC-SHA256 ou JWT para assinar requisições.
 */
@Injectable()
export class WebhookTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-webhook-token'];
    const expectedToken = process.env.EXTERNAL_SERVICE_TOKEN;

    if (!token || !expectedToken || token !== expectedToken) {
      throw new UnauthorizedException('Token de webhook inválido ou ausente');
    }

    // Marcar como validado no request para uso no use-case
    (request as any).webhookTokenValid = true;
    return true;
  }
}
