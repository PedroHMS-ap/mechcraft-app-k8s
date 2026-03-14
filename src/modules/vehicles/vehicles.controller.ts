import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('03 - Veículos')
@Roles('admin','recepcao')
@ApiBearerAuth('bearer')
@Controller('vehicles')
export class VehiclesController {
  constructor(private svc: VehiclesService) {}

  @Post()
  @ApiBody({
    type: CreateVehicleDto,
    examples: {
      exemplo: {
        value: {
          plate: 'ABC1D23',
          make: 'Fiat',
          model: 'Argo',
          year: 2021,
          customerId: 1,
        },
      },
    },
  })
  create(@Body() dto: CreateVehicleDto) {
    return this.svc.create(dto);
  }

  @Get()
  getByPlate(@Query('plate') plate?: string, @Query('customerId') customerId?: string) {
    if (plate) return this.svc.byPlate(plate);
    if (customerId) return this.svc.listByCustomer(+customerId);
    return [];
  }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.svc.byId(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehicleDto) {
    return this.svc.update(id, dto);
  }
}
