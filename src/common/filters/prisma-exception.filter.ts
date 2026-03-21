import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { noticeError, recordCustomEvent } from '../observability/newrelic';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let err: HttpException = new BadRequestException('Requisição inválida');

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': // Unique constraint
          err = new ConflictException('Violação de unicidade');
          break;
        case 'P2003': // Foreign key constraint
          err = new BadRequestException('Relacionamento inválido (FK). Verifique os IDs informados.');
          break;
        case 'P2022': // Column not found
          err = new BadRequestException('Coluna ausente no banco: aplique migrations (npx prisma migrate deploy).');
          break;
        default:
          err = new BadRequestException(`Erro de persistência (${exception.code})`);
      }
    }

    const status = (err.getStatus && err.getStatus()) || 400;
    const resBody = (err.getResponse && err.getResponse()) || { message: 'Bad Request' };

    noticeError(exception, {
      path: request?.originalUrl ?? request?.url ?? null,
      method: request?.method ?? null,
      requestId: request?.requestId ?? request?.headers?.['x-request-id'] ?? null,
      prismaCode: exception?.code ?? 'validation_error',
      statusCode: status,
    });

    if ((request?.originalUrl ?? request?.url ?? '').startsWith('/workorders')) {
      recordCustomEvent('WorkOrderProcessingFailure', {
        path: request?.originalUrl ?? request?.url ?? null,
        method: request?.method ?? null,
        requestId: request?.requestId ?? request?.headers?.['x-request-id'] ?? null,
        failureType: exception?.code ?? 'validation_error',
        statusCode: status,
      });
    }

    response.status(status).json(resBody);
  }
}
