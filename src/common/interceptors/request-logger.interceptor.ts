import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  addCustomAttributes,
  getLinkingMetadata,
  noticeError,
  recordCustomEvent,
  recordMetric,
  recordStructuredLog,
  setTransactionName,
} from '../observability/newrelic';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    const basePayload = {
      requestId: (req as any).requestId ?? req.headers['x-request-id'] ?? null,
      method: req.method,
      path: req.originalUrl ?? req.url,
    };
    const requestPath = String(basePayload.path || req.url || '');
    const isHealthcheck = requestPath === '/health' || requestPath === '/health/ready';

    addCustomAttributes(basePayload);
    if (isHealthcheck) {
      setTransactionName(requestPath === '/health' ? 'Health/Liveness' : 'Health/Readiness');
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startedAt;
          const payload = {
            ...basePayload,
            statusCode: res.statusCode,
            durationMs: duration,
            event: 'request_completed',
            ...getLinkingMetadata(),
          };

          recordMetric('Custom/Api/LatencyMs', duration);
          if (isHealthcheck) {
            recordCustomEvent('HealthCheckResult', {
              checkType: requestPath === '/health' ? 'liveness' : 'readiness',
              path: requestPath,
              durationMs: duration,
              statusCode: res.statusCode,
              isHealthy: res.statusCode < 400,
            });
          }

          this.logger.log(JSON.stringify(payload));
          recordStructuredLog('info', 'request_completed', payload);
        },
        error: (error: any) => {
          const duration = Date.now() - startedAt;
          const statusCode =
            (typeof error?.getStatus === 'function' && error.getStatus()) ||
            (res.statusCode && res.statusCode >= 400 ? res.statusCode : 500);
          const payload = {
            ...basePayload,
            statusCode,
            durationMs: duration,
            event: 'request_failed',
            error: error?.message ?? 'unknown_error',
            ...getLinkingMetadata(),
          };

          recordMetric('Custom/Api/LatencyMs', duration);
          if (isHealthcheck) {
            recordCustomEvent('HealthCheckResult', {
              checkType: requestPath === '/health' ? 'liveness' : 'readiness',
              path: requestPath,
              durationMs: duration,
              statusCode,
              isHealthy: false,
            });
          }
          if (requestPath.startsWith('/workorders') && statusCode >= 500) {
            recordCustomEvent('WorkOrderProcessingFailure', {
              requestId: basePayload.requestId,
              path: requestPath,
              method: req.method,
              statusCode,
              failureType: 'http_5xx',
            });
          }

          this.logger.error(JSON.stringify(payload));
          recordStructuredLog('error', 'request_failed', payload);
          noticeError(error, {
            requestId: basePayload.requestId,
            path: requestPath,
            method: req.method,
            statusCode,
          });
        },
      }),
    );
  }
}
