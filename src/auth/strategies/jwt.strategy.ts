import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: string;
  username?: string;
  roles?: string[];
  cpf?: string;
  customerId?: number;
  tokenType?: 'internal' | 'customer';
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    const secret = cfg.get<string>('JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      username: payload.username ?? null,
      roles: payload.roles ?? [],
      cpf: payload.cpf ?? null,
      customerId: payload.customerId ?? null,
      tokenType: payload.tokenType ?? 'internal',
    };
  }
}
