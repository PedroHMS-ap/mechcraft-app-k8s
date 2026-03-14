import { WorkOrdersService } from '@/modules/workorders/workorders.service';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const basePrisma = () => {
  const stub: any = {
    workOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    workOrderService: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    workOrderPart: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    serviceCatalog: { findUnique: jest.fn() },
    part: { findUnique: jest.fn(), update: jest.fn() },
    customer: { findUnique: jest.fn() },
    vehicle: { findUnique: jest.fn() },
    $transaction: jest.fn(async (arg: any) => {
      if (typeof arg === 'function') return arg(stub);
      return arg;
    }),
  };
  return stub;
};

let prismaStub: any;
let notifier: { sendEstimate: jest.Mock };
let service: WorkOrdersService;

describe('WorkOrdersService', () => {
  beforeEach(() => {
    prismaStub = basePrisma();
    notifier = { sendEstimate: jest.fn().mockResolvedValue(undefined) };
    service = new WorkOrdersService(prismaStub as any, notifier as any);
  });

  it('permite transicao de RECEIVED para DIAGNOSING', async () => {
    prismaStub.workOrder.findUnique.mockResolvedValue({ id: 1, status: WorkOrderStatus.RECEIVED });
    prismaStub.workOrder.update.mockResolvedValue({ id: 1, status: WorkOrderStatus.DIAGNOSING });

    const result = await service.updateStatus(1, { status: WorkOrderStatus.DIAGNOSING });

    expect(result.status).toBe(WorkOrderStatus.DIAGNOSING);
    expect(prismaStub.workOrder.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: WorkOrderStatus.DIAGNOSING }),
    });
  });

  it('bloqueia transicoes invalidas', async () => {
    prismaStub.workOrder.findUnique.mockResolvedValue({ id: 1, status: WorkOrderStatus.RECEIVED });

    await expect(service.updateStatus(1, { status: WorkOrderStatus.FINISHED })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('define timestamps ao mudar para IN_PROGRESS/FINISHED/DELIVERED', async () => {
    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 7, status: WorkOrderStatus.WAITING_APPROVAL });
    await service.updateStatus(7, { status: WorkOrderStatus.IN_PROGRESS });
    expect(prismaStub.workOrder.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ status: WorkOrderStatus.IN_PROGRESS, startedAt: expect.any(Date) }),
    });

    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 7, status: WorkOrderStatus.IN_PROGRESS });
    await service.updateStatus(7, { status: WorkOrderStatus.FINISHED });
    expect(prismaStub.workOrder.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ status: WorkOrderStatus.FINISHED, finishedAt: expect.any(Date) }),
    });

    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 7, status: WorkOrderStatus.FINISHED });
    await service.updateStatus(7, { status: WorkOrderStatus.DELIVERED });
    expect(prismaStub.workOrder.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ status: WorkOrderStatus.DELIVERED, deliveredAt: expect.any(Date) }),
    });
  });

  it('submitForApproval - sucesso e erros', async () => {
    prismaStub.workOrder.findUnique.mockResolvedValueOnce(null);
    await expect(service.submitForApproval(1, 'user')).rejects.toThrow(NotFoundException);

    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 1, status: WorkOrderStatus.RECEIVED });
    await expect(service.submitForApproval(1, 'user')).rejects.toThrow(BadRequestException);

    const customer = { id: 10, name: 'C1' } as any;
    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 1, status: WorkOrderStatus.DIAGNOSING, customer });
    prismaStub.workOrder.update.mockResolvedValue({ id: 1, status: WorkOrderStatus.WAITING_APPROVAL });
    const res = await service.submitForApproval(1, 'user');
    expect(notifier.sendEstimate).toHaveBeenCalledWith({ workOrderId: 1, customer, requestedBy: 'user' });
    expect(res.status).toBe(WorkOrderStatus.WAITING_APPROVAL);
  });

  it('approveOrder - checa status e approvedBy', async () => {
    prismaStub.workOrder.findUnique.mockResolvedValueOnce(null);
    await expect(service.approveOrder(9, 'u1')).rejects.toThrow(NotFoundException);

    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 9, status: WorkOrderStatus.DIAGNOSING });
    await expect(service.approveOrder(9, 'u1')).rejects.toThrow(BadRequestException);

    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 9, status: WorkOrderStatus.WAITING_APPROVAL });
    prismaStub.workOrder.update.mockResolvedValue({ id: 9, status: WorkOrderStatus.IN_PROGRESS, approvedBy: 'u1' });
    const ok = await service.approveOrder(9, 'u1');
    expect(ok.status).toBe(WorkOrderStatus.IN_PROGRESS);
    expect(prismaStub.workOrder.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: expect.objectContaining({ status: WorkOrderStatus.IN_PROGRESS, approvedAt: expect.any(Date), approvedBy: 'u1' }),
    });
  });

  it('denyOrder - checa status e deniedAt/reason', async () => {
    prismaStub.workOrder.findUnique.mockResolvedValueOnce(null);
    await expect(service.denyOrder(3, 'motivo', 'u1')).rejects.toThrow(NotFoundException);

    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 3, status: WorkOrderStatus.DIAGNOSING });
    await expect(service.denyOrder(3, 'motivo', 'u1')).rejects.toThrow(BadRequestException);

    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 3, status: WorkOrderStatus.WAITING_APPROVAL });
    prismaStub.workOrder.update.mockResolvedValue({ id: 3, status: WorkOrderStatus.DIAGNOSING, denialReason: 'motivo' });
    const ok = await service.denyOrder(3, 'motivo', 'u1');
    expect(ok.status).toBe(WorkOrderStatus.DIAGNOSING);
  });

  it('create - valida cliente/veiculo e vinculos', async () => {
    prismaStub.customer.findUnique.mockResolvedValueOnce(null);
    await expect(service.create({ customerId: 1, vehicleId: 2, description: 'd' } as any)).rejects.toThrow(
      BadRequestException,
    );

    prismaStub.customer.findUnique.mockResolvedValueOnce({ id: 1 });
    prismaStub.vehicle.findUnique.mockResolvedValueOnce(null);
    await expect(service.create({ customerId: 1, vehicleId: 2, description: 'd' } as any)).rejects.toThrow(
      BadRequestException,
    );

    prismaStub.customer.findUnique.mockResolvedValueOnce({ id: 1 });
    prismaStub.vehicle.findUnique.mockResolvedValueOnce({ id: 2, customerId: 999 });
    await expect(service.create({ customerId: 1, vehicleId: 2, description: 'd' } as any)).rejects.toThrow(
      BadRequestException,
    );

    prismaStub.customer.findUnique.mockResolvedValueOnce({ id: 1 });
    prismaStub.vehicle.findUnique.mockResolvedValueOnce({ id: 2, customerId: 1 });
    prismaStub.workOrder.create.mockResolvedValue({ id: 10, status: WorkOrderStatus.RECEIVED });
    const created = await service.create({ customerId: 1, vehicleId: 2, description: 'ok' } as any);
    expect(created.id).toBe(10);
  });

  it('create aceita servicos/pecas e atualiza estoque/totais', async () => {
    prismaStub.customer.findUnique.mockResolvedValue({ id: 1 });
    prismaStub.vehicle.findUnique.mockResolvedValue({ id: 2, customerId: 1 });
    prismaStub.serviceCatalog.findUnique.mockResolvedValue({ id: 1, active: true, unitPrice: new Prisma.Decimal(100) });
    prismaStub.part.findUnique.mockResolvedValue({ id: 2, active: true, stockQty: 5, unitPrice: new Prisma.Decimal(50) });
    prismaStub.workOrder.create.mockResolvedValue({ id: 99, status: WorkOrderStatus.RECEIVED });
    prismaStub.workOrderService.create.mockResolvedValue({ id: 1 });
    prismaStub.workOrderPart.create.mockResolvedValue({ id: 2 });
    prismaStub.workOrderService.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(200) } });
    prismaStub.workOrderPart.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(100) } });
    prismaStub.workOrder.update.mockResolvedValue({});
    prismaStub.part.update.mockResolvedValue({});
    prismaStub.workOrder.findUnique.mockResolvedValue({
      id: 99,
      status: WorkOrderStatus.RECEIVED,
      services: [{ id: 1, serviceId: 1, qty: 2 }],
      parts: [{ id: 2, partId: 2, qty: 1 }],
    });
    prismaStub.$transaction = jest.fn().mockImplementation(async callback => callback(prismaStub));

    const created = await service.create({
      customerId: 1,
      vehicleId: 2,
      description: 'Completa',
      services: [{ serviceId: 1, qty: 2 }],
      parts: [{ partId: 2, qty: 1 }],
    } as any);

    expect(prismaStub.workOrderService.create).toHaveBeenCalled();
    expect(prismaStub.workOrderPart.create).toHaveBeenCalled();
    expect(prismaStub.part.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { stockQty: { decrement: 1 } } });
    expect(created?.services?.length).toBe(1);
    expect(created?.parts?.length).toBe(1);
  });

  it('addServiceItem - bloqueios e sucesso', async () => {
    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 1, status: WorkOrderStatus.WAITING_APPROVAL });
    await expect(service.addServiceItem(1, { serviceId: 1, qty: 1 } as any)).rejects.toThrow(BadRequestException);

    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 1, status: WorkOrderStatus.DIAGNOSING });
    prismaStub.serviceCatalog.findUnique.mockResolvedValueOnce({ id: 1, active: false });
    await expect(service.addServiceItem(1, { serviceId: 1, qty: 1 } as any)).rejects.toThrow(BadRequestException);

    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 1, status: WorkOrderStatus.DIAGNOSING });
    prismaStub.serviceCatalog.findUnique.mockResolvedValueOnce({ id: 1, active: true, unitPrice: new Prisma.Decimal(100) });
    prismaStub.workOrderService.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(100) } });
    prismaStub.workOrderPart.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(0) } });
    // Mockar $transaction para retornar work order com services
    prismaStub.$transaction = jest.fn().mockImplementation((callback) => 
      callback({
        workOrderService: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        workOrder: { 
          findUnique: jest.fn().mockResolvedValue({
            id: 1,
            status: WorkOrderStatus.DIAGNOSING,
            services: [{ id: 1, serviceId: 1, qty: 2 }],
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      })
    );
    const result = await service.addServiceItem(1, { serviceId: 1, qty: 2 } as any);
    expect(result).toBeDefined();
  });

  it('addPartItem - bloqueios, estoque insuficiente e sucesso', async () => {
    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 2, status: WorkOrderStatus.FINISHED });
    await expect(service.addPartItem(2, { partId: 1, qty: 1 } as any)).rejects.toThrow(BadRequestException);

    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 2, status: WorkOrderStatus.DIAGNOSING });
    prismaStub.part.findUnique.mockResolvedValueOnce({ id: 1, active: false });
    await expect(service.addPartItem(2, { partId: 1, qty: 1 } as any)).rejects.toThrow(BadRequestException);

    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 2, status: WorkOrderStatus.DIAGNOSING });
    prismaStub.part.findUnique.mockResolvedValueOnce({ id: 1, active: true, stockQty: 0 });
    await expect(service.addPartItem(2, { partId: 1, qty: 5 } as any)).rejects.toThrow(BadRequestException);

    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 2, status: WorkOrderStatus.DIAGNOSING });
    prismaStub.part.findUnique.mockResolvedValueOnce({ id: 1, active: true, stockQty: 10, unitPrice: new Prisma.Decimal(50) });
    prismaStub.workOrderService.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(0) } });
    prismaStub.workOrderPart.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(100) } });
    // Mockar $transaction para retornar work order com parts
    prismaStub.$transaction = jest.fn().mockImplementation((callback) => 
      callback({
        workOrderPart: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        part: { update: jest.fn().mockResolvedValue({}) },
        workOrder: { 
          findUnique: jest.fn().mockResolvedValue({
            id: 2,
            status: WorkOrderStatus.DIAGNOSING,
            parts: [{ id: 1, partId: 1, qty: 2, part: {} }],
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      })
    );
    const ok = await service.addPartItem(2, { partId: 1, qty: 2 } as any);
    expect(ok).toBeDefined();
  });

  it('removeServiceItem - valida existencia, bloqueio e recalculo', async () => {
    prismaStub.workOrderService.findUnique.mockResolvedValueOnce(null);
    await expect(service.removeServiceItem(1)).rejects.toThrow(NotFoundException);

    prismaStub.workOrderService.findUnique.mockResolvedValueOnce({ id: 1, workOrderId: 9 });
    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 9, status: WorkOrderStatus.WAITING_APPROVAL });
    await expect(service.removeServiceItem(1)).rejects.toThrow(BadRequestException);

    prismaStub.workOrderService.findUnique.mockResolvedValueOnce({ id: 1, workOrderId: 9 });
    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 9, status: WorkOrderStatus.DIAGNOSING });
    prismaStub.workOrderService.delete.mockResolvedValue({});
    prismaStub.workOrderService.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(0) } });
    prismaStub.workOrderPart.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(0) } });
    prismaStub.workOrder.update.mockResolvedValue({});
    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 9 });
    const res = await service.removeServiceItem(1);
    expect(res).toBeDefined();
  });

  it('removePartItem - valida existencia, bloqueio e reposicao', async () => {
    prismaStub.workOrderPart.findUnique.mockResolvedValueOnce(null);
    await expect(service.removePartItem(1)).rejects.toThrow(NotFoundException);

    prismaStub.workOrderPart.findUnique.mockResolvedValueOnce({ id: 2, workOrderId: 7, partId: 5, qty: 3 });
    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 7, status: WorkOrderStatus.FINISHED });
    await expect(service.removePartItem(1)).rejects.toThrow(BadRequestException);

    prismaStub.workOrderPart.findUnique.mockResolvedValueOnce({ id: 2, workOrderId: 7, partId: 5, qty: 3 });
    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 7, status: WorkOrderStatus.DIAGNOSING });
    prismaStub.workOrderPart.delete.mockResolvedValue({});
    prismaStub.part.update.mockResolvedValue({});
    prismaStub.workOrderService.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(0) } });
    prismaStub.workOrderPart.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(0) } });
    prismaStub.workOrder.update.mockResolvedValue({});
    jest.spyOn(service as any, 'byId').mockResolvedValueOnce({ id: 7 });
    const res = await service.removePartItem(1);
    expect(res).toBeDefined();
  });

  it('publicByCode - not found e sucesso', async () => {
    prismaStub.workOrder.findUnique.mockResolvedValueOnce(null);
    await expect(service.publicByCode('x')).rejects.toThrow(NotFoundException);

    prismaStub.workOrder.findUnique.mockResolvedValueOnce({ id: 1, publicCode: 'abc', status: WorkOrderStatus.RECEIVED });
    const ok = await service.publicByCode('abc');
    expect(ok.publicCode).toBe('abc');
  });
});
