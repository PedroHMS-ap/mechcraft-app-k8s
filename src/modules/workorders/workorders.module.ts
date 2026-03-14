import { Module } from '@nestjs/common';
import { WorkOrdersService } from './workorders.service';
import { WorkOrdersController } from './workorders.controller';
import { BudgetNotifierService } from '@/common/notifications/budget-notifier.service';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaWorkOrderRepository } from './infra/prisma-workorder.repository';
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
import { WebhookTokenGuard } from './guards/webhook-token.guard';
import { CustomerWorkOrdersController } from './customer-workorders.controller';

@Module({
  controllers: [WorkOrdersController, CustomerWorkOrdersController],
  providers: [
    WorkOrdersService,
    BudgetNotifierService,
    PrismaService,
    PrismaWorkOrderRepository,
    { provide: 'WorkOrderRepository', useExisting: PrismaWorkOrderRepository },
    CreateWorkOrderUseCase,
    SubmitForApprovalUseCase,
    ListWorkOrdersUseCase,
    UpdateStatusUseCase,
    ApproveViaWebhookUseCase,
    SecureWebhookApprovalUseCase,
    AddServiceItemUseCase,
    AddPartItemUseCase,
    RemoveServiceItemUseCase,
    RemovePartItemUseCase,
    WebhookTokenGuard,
  ],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
