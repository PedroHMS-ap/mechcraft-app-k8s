import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { WorkOrdersService } from './workorders.service';
import { CreateWorkOrderDto, UpdateWorkOrderStatusDto } from './dto';
import { CreateWorkOrderUseCase } from './application/create-workorder.usecase';
import { SubmitForApprovalUseCase } from './application/submit-for-approval.usecase';
import { ListWorkOrdersUseCase } from './application/list-workorders.usecase';
import { UpdateStatusUseCase } from './application/update-status.usecase';
import { ApproveViaWebhookUseCase } from './application/approve-via-webhook.usecase';
import { SecureWebhookApprovalUseCase } from './application/secure-webhook-approval.usecase';
import { AddServiceItemUseCase } from './application/add-service-item.usecase';
import { AddPartItemUseCase } from './application/add-part-item.usecase';
import { RemoveServiceItemUseCase } from './application/remove-service-item.usecase';
import { RemovePartItemUseCase } from './application/remove-part-item.usecase';
import { WorkOrderStatus } from '@prisma/client';
import { Roles } from '@/common/decorators/roles.decorator';
import { AddServiceItemDto, AddPartItemDto } from './items.dto';
import { DenyWorkOrderDto } from './dto/deny-workorder.dto';
import { ApproveViaWebhookDto } from './dto/approve-webhook.dto';
import { WebhookApprovalRequestDto } from './dto/webhook-approval-request.dto';
import { EmailStatusUpdateDto } from './dto/email-status.dto';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiTags } from '@nestjs/swagger';
import { WebhookTokenGuard } from './guards/webhook-token.guard';

@ApiTags('04 - Ordens de Servico')
@Roles('admin','recepcao','mecanico')
@ApiBearerAuth('bearer')
@Controller('workorders')
export class WorkOrdersController {
  constructor(
    private svc: WorkOrdersService,
    private createUseCase: CreateWorkOrderUseCase,
    private submitUseCase: SubmitForApprovalUseCase,
    private listUseCase: ListWorkOrdersUseCase,
    private updateUseCase: UpdateStatusUseCase,
    private addServiceUseCase: AddServiceItemUseCase,
    private addPartUseCase: AddPartItemUseCase,
    private removeServiceUseCase: RemoveServiceItemUseCase,
    private removePartUseCase: RemovePartItemUseCase,
    private approveWebhookUseCase: ApproveViaWebhookUseCase,
    private secureApproveWebhookUseCase: SecureWebhookApprovalUseCase,
  ) {}
  @Post('webhook/approve')
  @ApiBody({
    type: ApproveViaWebhookDto,
    examples: {
      approve: {
        value: {
          publicCode: 'OS-001-20251209',
          action: 'APPROVE',
          externalId: 'ext-123456',
        },
      },
      deny: {
        value: {
          publicCode: 'OS-001-20251209',
          action: 'DENY',
          reason: 'Aguardando esclarecimentos do cliente',
          externalId: 'ext-123457',
        },
      },
    },
  })
  approveViaWebhook(@Body() dto: ApproveViaWebhookDto) {
    return this.approveWebhookUseCase.execute(dto);
  }

  @Post('webhook/secure-approve')
  @UseGuards(WebhookTokenGuard)
  @ApiHeader({
    name: 'X-Webhook-Token',
    required: true,
    description: 'Token do webhook (EXTERNAL_SERVICE_TOKEN).',
  })
  @ApiBody({
    type: WebhookApprovalRequestDto,
    description: 'Requer header X-Webhook-Token com token valido.',
    examples: {
      approve: {
        value: {
          publicCode: 'uuid-123-456',
          action: 'APPROVE',
          externalId: 'ext-webhook-001',
          idempotencyKey: 'webhook-uuid-001',
        },
      },
      deny: {
        value: {
          publicCode: 'uuid-123-456',
          action: 'DENY',
          reason: 'Cliente nao aprovou',
          externalId: 'ext-webhook-002',
          idempotencyKey: 'webhook-uuid-002',
        },
      },
    },
  })
  secureApproveViaWebhook(@Body() dto: WebhookApprovalRequestDto, @Req() req: any) {
    const tokenValid = (req as any).webhookTokenValid === true;
    return this.secureApproveWebhookUseCase.execute(dto, tokenValid);
  }

  // Integracao via e-mail/ferramenta externa: recebe codigo publico da OS e novo status
  @Post('email/status')
  @ApiBody({
    type: EmailStatusUpdateDto,
    examples: {
      diagnostico: { value: { publicCode: 'OS-001-20251209', status: 'DIAGNOSING' } },
      emExecucao: { value: { publicCode: 'OS-001-20251209', status: 'IN_PROGRESS' } },
    },
  })
  async updateStatusViaEmail(@Body() dto: EmailStatusUpdateDto) {
    const order = await this.svc.publicByCode(dto.publicCode);
    return this.updateUseCase.execute(order.id, dto.status as any);
  }

  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.submitUseCase.execute(id, req.user?.userId ?? 'system');
  }

  @Post(':id/deny')
  @ApiBody({
    type: DenyWorkOrderDto,
    examples: {
      exemplo: { value: { reason: 'Cliente solicitou ajuste' } },
    },
  })
  deny(@Param('id', ParseIntPipe) id: number, @Body() dto: DenyWorkOrderDto, @Req() req: any) {
    return this.svc.denyOrder(id, dto.reason, req.user?.userId ?? 'system');
  }

  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.svc.approveOrder(id, req.user?.userId ?? 'system');
  }

  @Post()
  @ApiBody({
    type: CreateWorkOrderDto,
    examples: {
      exemplo: {
        value: {
          customerId: 1,
          vehicleId: 1,
          description: 'Revisao + troca de oleo',
          services: [{ serviceId: 10, qty: 1 }],
          parts: [{ partId: 5, qty: 2 }],
        },
      },
    },
  })
  create(@Body() dto: CreateWorkOrderDto) {
    return this.createUseCase.execute(dto as any);
  }

  @Get()
  list(@Query('status') status?: WorkOrderStatus) {
    return this.listUseCase.execute(status as any);
  }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.svc.byId(id);
  }

  @Put(':id/status')
  @ApiBody({
    type: UpdateWorkOrderStatusDto,
    examples: {
      diagnostico: { value: { status: 'DIAGNOSING' } },
      aprovar: { value: { status: 'IN_PROGRESS' } },
      finalizar: { value: { status: 'FINISHED' } },
      entregar: { value: { status: 'DELIVERED' } },
    },
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.updateUseCase.execute(id, dto.status as any);
  }

  @Post(':id/items/service')
  @ApiBody({
    type: AddServiceItemDto,
    examples: { exemplo: { value: { serviceId: 1, qty: 1 } } },
  })
  addService(@Param('id', ParseIntPipe) id: number, @Body() dto: AddServiceItemDto) {
    return this.addServiceUseCase.execute(id, dto.serviceId, dto.qty);
  }

  @Post(':id/items/part')
  @ApiBody({
    type: AddPartItemDto,
    examples: { exemplo: { value: { partId: 1, qty: 4 } } },
  })
  addPart(@Param('id', ParseIntPipe) id: number, @Body() dto: AddPartItemDto) {
    return this.addPartUseCase.execute(id, dto.partId, dto.qty);
  }

  @Delete('items/service/:itemId')
  removeService(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.removeServiceUseCase.execute(itemId);
  }

  @Delete('items/part/:itemId')
  removePart(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.removePartUseCase.execute(itemId);
  }

}






