import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { PartsService } from './parts.service';
import { CreatePartDto, UpdatePartDto } from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';

 

@ApiBearerAuth('bearer')
 
@ApiTags('06 - Peças')
 
@Roles('admin')
@Controller('parts')
export class PartsController {
  constructor(private svc: PartsService) {}

  @Post()
  @ApiBody({
    type: CreatePartDto,
    examples: {
      exemplo: {
        value: {
          sku: 'OLEO-5W30',
          name: 'Óleo 5W30 (1L)',
          unitCost: '30.00',
          unitPrice: '55.00',
          stockQty: 10,
          active: true,
        },
      },
    },
  })
  create(@Body() dto: CreatePartDto) {
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
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePartDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/stock/:delta')
  adjust(@Param('id', ParseIntPipe) id: number, @Param('delta', ParseIntPipe) delta: number) {
    return this.svc.adjustStock(id, delta);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deactivate(id);
  }
}

