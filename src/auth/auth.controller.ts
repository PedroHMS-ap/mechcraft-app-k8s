// apps/api/src/auth/auth.controller.ts
import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';

@ApiTags('01 - Sistema')
@ApiBearerAuth('bearer')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @ApiBody({
    type: LoginDto,
    description: 'Credenciais de acesso (MVP) para obter o token JWT',
    examples: {
      admin: { value: { username: 'admin', usernameField: 'username', password: 'admin123' } },
      recepcao: { value: { username: 'atendente', password: '123456' } },
      mecanico: { value: { username: 'mecanico', password: '123456' } },
    },
  })
  @Post('login')
  async login(@Request() req: any) {
    return this.auth.login(req.user);
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
