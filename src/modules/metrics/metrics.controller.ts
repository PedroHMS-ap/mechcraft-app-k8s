import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('08 - Metricas')
@Roles('admin')
@ApiBearerAuth('bearer')
@Controller('metrics')
export class MetricsController {
  constructor(private svc: MetricsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Quantidade de OS por status' })
  countByStatus() {
    return this.svc.countByStatus();
  }

  @Get('leadtime')
  @ApiOperation({ summary: 'Tempo medio (dias) entre abertura e finalizacao' })
  averageLeadTime() {
    return this.svc.averageLeadTime();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Faturamento total das OS finalizadas' })
  totalRevenue() {
    return this.svc.totalRevenue();
  }

  @Get('top-services')
  @ApiOperation({ summary: 'Top servicos mais realizados' })
  topServices() {
    return this.svc.topServices();
  }

  @Get('top-parts')
  @ApiOperation({ summary: 'Top pecas mais utilizadas' })
  topParts() {
    return this.svc.topParts();
  }

  @Get('daily-volume')
  @ApiOperation({ summary: 'Volume diario de ordens de servico' })
  dailyVolume(@Query('days') days?: string) {
    const window = Number(days ?? 30);
    return this.svc.dailyOrderVolume(Number.isNaN(window) ? 30 : window);
  }

  @Get('avg-time-by-status')
  @ApiOperation({ summary: 'Tempo medio por etapa (diagnostico, execucao, finalizacao)' })
  avgTimeByStatus() {
    return this.svc.averageExecutionTimeByStatus();
  }

  @Get('integration-errors')
  @ApiOperation({ summary: 'Falhas em integracoes externas (webhook/aprovacao)' })
  integrationErrors() {
    return this.svc.integrationFailuresSummary();
  }
}

