import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { CpfProtected } from '@/auth/cpf-protected.decorator';
import { WorkOrdersService } from './workorders.service';
import { CustomerCreateWorkOrderDto } from './dto/customer-create-workorder.dto';
import { CreateWorkOrderUseCase } from './application/create-workorder.usecase';

@ApiTags('05 - Portal Cliente')
@ApiBearerAuth('bearer')
@CpfProtected()
@Controller('customer/workorders')
export class CustomerWorkOrdersController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly createWorkOrderUseCase: CreateWorkOrderUseCase,
  ) {}

  @Get()
  async listOwn(@Req() req: any) {
    const customerId = Number(req.user?.customerId);
    return this.workOrdersService.listByCustomer(customerId);
  }

  @Get(':publicCode/status')
  async statusByPublicCode(@Param('publicCode') publicCode: string, @Req() req: any) {
    const customerId = Number(req.user?.customerId);
    const order: any = await this.workOrdersService.publicByCodeForCustomer(publicCode, customerId);
    return {
      publicCode: order.publicCode,
      status: order.status,
      estimateSentAt: order.estimateSentAt ?? null,
      approvedAt: order.approvedAt ?? null,
      deniedAt: order.deniedAt ?? null,
      startedAt: order.startedAt ?? null,
      finishedAt: order.finishedAt ?? null,
      deliveredAt: order.deliveredAt ?? null,
    };
  }

  @Post()
  @ApiBody({
    type: CustomerCreateWorkOrderDto,
    description: 'Abre uma OS para o cliente autenticado por CPF.',
  })
  async createOwn(@Body() dto: CustomerCreateWorkOrderDto, @Req() req: any) {
    const customerId = Number(req.user?.customerId);
    return this.createWorkOrderUseCase.execute({
      customerId,
      vehicleId: dto.vehicleId,
      description: dto.description,
      services: dto.services,
      parts: dto.parts,
    } as any);
  }
}

