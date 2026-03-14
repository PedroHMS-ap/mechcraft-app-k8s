import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, UserEntity } from './users.service';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<UserEntity, 'password'> | null> {
    const user = await this.users.findByUsername(username);
    if (user && user.password === password) {
      const { password: _pw, ...safe } = user;
      return safe;
    }
    return null;
  }

  async login(user: Omit<UserEntity, 'password'>) {
    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
      tokenType: 'internal' as const,
    };
    return {
      access_token: await this.jwt.signAsync(payload),
      user,
    };
  }
}
