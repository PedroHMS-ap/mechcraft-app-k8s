import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { BudgetNotifierService } from '@/common/notifications/budget-notifier.service';
import { PrismaWorkOrderRepository } from './infra/prisma-workorder.repository';
import { WorkOrderRepository } from './domain/workorder.repository';
import { CreateWorkOrderDto, UpdateWorkOrderStatusDto } from './dto';
import { AddPartItemDto, AddServiceItemDto } from './items.dto';
import { noticeError, recordCustomEvent } from '@/common/observability/newrelic';

@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject('WorkOrderRepository') private repo: WorkOrderRepository,
    private notifier: BudgetNotifierService,
  ) {
    // Tests instantiate this service with a Prisma-like stub. Keep backward compatibility.
    if (repo && (repo as any).workOrder && typeof (repo as any).workOrder.findUnique === 'function') {
      this.repo = new PrismaWorkOrderRepository(repo as any);
    }
  }

  async submitForApproval(id: number, requestedBy: string) {
    const order: any = await this.byId(id);
    if (!order) throw new NotFoundException('OS nao encontrada');
    if (order.status !== WorkOrderStatus.DIAGNOSING) {
      throw new BadRequestException('So e possivel enviar para aprovacao apos diagnostico');
    }

    const customer =
      order.customer && order.customer.id
        ? order.customer
        : (await (this.repo as any).prisma?.customer?.findUnique?.({
            where: { id: order.customerId },
          })) ?? { id: order.customerId };

    try {
      await this.notifier.sendEstimate({ workOrderId: order.id, customer, requestedBy } as any);
    } catch (error) {
      noticeError(error, {
        workOrderId: order.id,
        channel: 'budget_notification',
        operation: 'send_estimate',
      });
      recordCustomEvent('WorkOrderIntegrationFailure', {
        channel: 'budget_notification',
        failureType: 'send_estimate_failed',
        workOrderId: order.id,
      });
      throw error;
    }
    return this.repo.updateStatus(id, WorkOrderStatus.WAITING_APPROVAL as any);
  }

  async publicByCode(code: string) {
    const order = await this.repo.findByPublicCode(code);
    if (!order) throw new NotFoundException('OS nao encontrada');
    return order;
  }

  async listByCustomer(customerId: number) {
    return this.repo.listByCustomer(customerId);
  }

  async publicByCodeForCustomer(code: string, customerId: number) {
    const order = await this.repo.findByPublicCodeForCustomer(code, customerId);
    if (!order) throw new NotFoundException('OS nao encontrada para este cliente');
    return order;
  }

  async approveOrder(id: number, userId?: string) {
    const order: any = await this.repo.findById(id);
    if (!order) throw new NotFoundException('OS nao encontrada');
    if (order.status !== ('WAITING_APPROVAL' as any)) {
      throw new BadRequestException('So e possivel aprovar quando em espera de aprovacao');
    }
    return this.repo.updateStatus(id, 'IN_PROGRESS' as any, {
      approvedAt: new Date(),
      approvedBy: userId,
    });
  }

  async denyOrder(id: number, reason: string, userId?: string) {
    const order: any = await this.repo.findById(id);
    if (!order) throw new NotFoundException('OS nao encontrada');
    if (order.status !== ('WAITING_APPROVAL' as any)) {
      throw new BadRequestException('So e possivel negar quando em espera de aprovacao');
    }
    return this.repo.updateStatus(id, 'DIAGNOSING' as any, {
      deniedAt: new Date(),
      denialReason: reason,
      deniedBy: userId,
    });
  }

  async create(dto: CreateWorkOrderDto) {
    const customer =
      (await (this.repo as any).prisma?.customer?.findUnique?.({
        where: { id: dto.customerId },
      })) ??
      (await (this.repo as any).customer?.findUnique?.({
        where: { id: dto.customerId },
      }));
    if (!customer) throw new BadRequestException('Cliente invalido');

    const vehicle =
      (await (this.repo as any).prisma?.vehicle?.findUnique?.({
        where: { id: dto.vehicleId },
      })) ??
      (await (this.repo as any).vehicle?.findUnique?.({
        where: { id: dto.vehicleId },
      }));
    if (!vehicle) throw new BadRequestException('Veiculo invalido');
    if (vehicle.customerId !== dto.customerId) {
      throw new BadRequestException('Veiculo nao pertence ao cliente informado');
    }

    const serviceItems =
      dto.services?.map(async item => {
        const svc = await this.repo.getServiceById(item.serviceId);
        if (!svc || !svc.active) throw new BadRequestException('Servico invalido');
        const unitPrice = svc.unitPrice;
        const total = (Number(unitPrice) * item.qty).toString();
        return { serviceId: item.serviceId, qty: item.qty, unitPrice, total };
      }) ?? [];

    const partItems =
      dto.parts?.map(async item => {
        const part = await this.repo.getPartById(item.partId);
        if (!part || !part.active) throw new BadRequestException('Peca invalida');
        if (part.stockQty < item.qty) throw new BadRequestException('Estoque insuficiente');
        const unitPrice = part.unitPrice;
        const total = (Number(unitPrice) * item.qty).toString();
        return { partId: item.partId, qty: item.qty, unitPrice, total };
      }) ?? [];

    const [serviceItemsResolved, partItemsResolved] = await Promise.all([
      Promise.all(serviceItems),
      Promise.all(partItems),
    ]);

    return this.repo.create({
      customerId: dto.customerId,
      vehicleId: dto.vehicleId,
      description: dto.description,
      serviceItems: serviceItemsResolved,
      partItems: partItemsResolved,
    } as any);
  }

  async list(status?: any) {
    return this.repo.list(status as any);
  }

  async byId(id: number) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('Ordem nao encontrada');
    return order;
  }

  async updateStatus(id: number, dto: UpdateWorkOrderStatusDto) {
    const order: any = await this.byId(id);
    if (!order) throw new NotFoundException('OS nao encontrada');

    if (order.status === WorkOrderStatus.RECEIVED && dto.status !== WorkOrderStatus.DIAGNOSING) {
      throw new BadRequestException('Transicao invalida');
    }

    const meta: any = {};
    if (dto.status === WorkOrderStatus.IN_PROGRESS) meta.startedAt = new Date();
    if (dto.status === WorkOrderStatus.FINISHED) meta.finishedAt = new Date();
    if (dto.status === WorkOrderStatus.DELIVERED) meta.deliveredAt = new Date();

    return this.repo.updateStatus(id, dto.status as any, meta);
  }

  async addServiceItem(workOrderId: number, dto: AddServiceItemDto) {
    const wo = await this.byId(workOrderId);
    if (!wo) throw new NotFoundException('OS nao encontrada');
    if (wo.status !== ('DIAGNOSING' as any)) throw new BadRequestException('OS bloqueada');

    const svc = await (this.repo as any).getServiceById(dto.serviceId);
    if (!svc || !svc.active) throw new BadRequestException('Servico invalido');
    const unitPrice = svc.unitPrice;
    const total = (Number(unitPrice) * dto.qty).toString();
    return this.repo.addServiceItem(workOrderId, {
      serviceId: dto.serviceId,
      qty: dto.qty,
      unitPrice,
      total,
    } as any);
  }

  async addPartItem(workOrderId: number, dto: AddPartItemDto) {
    const wo = await this.byId(workOrderId);
    if (!wo) throw new NotFoundException('OS nao encontrada');
    if (wo.status !== ('DIAGNOSING' as any)) throw new BadRequestException('OS bloqueada');

    const part = await (this.repo as any).getPartById(dto.partId);
    if (!part || !part.active) throw new BadRequestException('Peca invalida');
    if (part.stockQty < dto.qty) throw new BadRequestException('Estoque insuficiente');
    const unitPrice = part.unitPrice;
    const total = (Number(unitPrice) * dto.qty).toString();
    return this.repo.addPartItem(workOrderId, {
      partId: dto.partId,
      qty: dto.qty,
      unitPrice,
      total,
    } as any);
  }

  async removeServiceItem(itemId: number) {
    return this.repo.removeServiceItem(itemId);
  }

  async removePartItem(itemId: number) {
    return this.repo.removePartItem(itemId);
  }
}
