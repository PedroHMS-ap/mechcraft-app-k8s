import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

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
    response.status(status).json(resBody);
  }
}
