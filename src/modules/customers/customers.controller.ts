import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';


@ApiBearerAuth('bearer')
@Roles('admin', 'recepcao')
@ApiTags('02 - Clientes')
@Controller('customers')
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Post()
  @ApiBody({
    type: CreateCustomerDto,
    examples: {
      exemplo: {
        value: {
          name: 'João da Silva',
          document: '52998224725',
          phone: '11988887777',
          email: 'joao@exemplo.com',
        },
      },
    },
  })
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.create(dto);
  }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findById(id);
  }

  @Get()
  search(@Query('document') document?: string, @Query('name') name?: string) {
    return this.svc.search({ document, name });
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.svc.update(id, dto);
  }
}
