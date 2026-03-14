import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<any>();
    const roles: string[] = req.user?.roles ?? [];
    const ok = required.some(r => roles.includes(r));
    if (!ok) {
      throw new ForbiddenException('Sem permissão para acessar este recurso');
    }
    return true;
  }
}
