import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CPF_PROTECTED_KEY } from './cpf-protected.decorator';

@Injectable()
export class CpfAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(CPF_PROTECTED_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest<any>();
    const user = req.user ?? {};
    const validCustomerToken =
      user.tokenType === 'customer' &&
      typeof user.customerId === 'number' &&
      typeof user.cpf === 'string' &&
      user.cpf.length === 11;

    if (!validCustomerToken) {
      throw new ForbiddenException('Rota protegida para autenticacao de cliente por CPF');
    }

    return true;
  }
}

