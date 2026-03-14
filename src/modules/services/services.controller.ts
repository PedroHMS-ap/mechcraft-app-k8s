import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('05 - Serviços')
@Roles('admin')
@ApiBearerAuth('bearer')
@Controller('services')
export class ServicesController {
  constructor(private svc: ServicesService) {}

  @Post()
  @ApiBody({
    type: CreateServiceDto,
    examples: {
      exemplo: {
        value: {
          code: 'TROCA_OLEO',
          name: 'Troca de Óleo',
          unitPrice: '120.00',
          active: true,
        },
      },
    },
  })
  create(@Body() dto: CreateServiceDto) {
    return this.svc.create(dto);
  }

  @Get()
  list(@Query('q') q?: string, @Query('active') active?: string) {
    const a = active === undefined ? undefined : active === 'true';
    return this.svc.list({ q, active: a });
  }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.svc.byId(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServiceDto) {
    return this.svc.update(id, dto);
  }
}
