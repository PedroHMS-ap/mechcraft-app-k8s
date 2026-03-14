import { Injectable } from '@nestjs/common';

export type UserEntity = {
  id: string;
  username: string;
  password: string; // MVP somente - trocar para hash no futuro
  roles: Array<'admin' | 'recepcao' | 'mecanico'>;
};

@Injectable()
export class UsersService {
  private users: UserEntity[] = [
    { id: '1', username: 'admin', password: 'admin123', roles: ['admin'] },
    { id: '2', username: 'atendente', password: '123456', roles: ['recepcao'] },
    { id: '3', username: 'mecanico', password: '123456', roles: ['mecanico'] },
  ];

  async findByUsername(username: string) {
    return this.users.find(u => u.username === username) ?? null;
  }
}
