import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/public.decorator';


@ApiTags('01 - Sistema')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return { ok: true, ts: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  readiness() {
    return { ready: true, ts: new Date().toISOString() };
  }
}