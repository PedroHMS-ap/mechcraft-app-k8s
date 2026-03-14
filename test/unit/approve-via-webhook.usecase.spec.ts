import { Test, TestingModule } from '@nestjs/testing';
import { ApproveViaWebhookUseCase, ApproveViaWebhookRequest } from '../../src/modules/workorders/application/approve-via-webhook.usecase';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';

describe('ApproveViaWebhookUseCase', () => {
  let useCase: ApproveViaWebhookUseCase;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findByPublicCode: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveViaWebhookUseCase,
        { provide: 'WorkOrderRepository', useValue: repository },
      ],
    }).compile();

    useCase = module.get(ApproveViaWebhookUseCase);
  });

  describe('execute', () => {
    it('should approve a work order via webhook', async () => {
      const request: ApproveViaWebhookRequest = {
        publicCode: 'OS-001-20251209',
        action: 'APPROVE',
        externalId: 'ext-123456',
      };

      const existingOrder = {
        id: 1,
        publicCode: 'OS-001-20251209',
        status: WorkOrderStatus.WAITING_APPROVAL,
      };

      const updatedOrder = {
        ...existingOrder,
        status: WorkOrderStatus.IN_PROGRESS,
        approvedAt: expect.any(Date),
        approvedBy: 'webhook-ext-123456',
      };

      repository.findByPublicCode.mockResolvedValue(existingOrder);
      repository.updateStatus.mockResolvedValue(updatedOrder);

      const result = await useCase.execute(request);

      expect(repository.findByPublicCode).toHaveBeenCalledWith('OS-001-20251209');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        1,
        WorkOrderStatus.IN_PROGRESS,
        expect.objectContaining({
          approvedAt: expect.any(Date),
          approvedBy: 'webhook-ext-123456',
        }),
      );
      expect(result.status).toBe(WorkOrderStatus.IN_PROGRESS);
    });

    it('should deny a work order via webhook', async () => {
      const request: ApproveViaWebhookRequest = {
        publicCode: 'OS-001-20251209',
        action: 'DENY',
        reason: 'Aguardando esclarecimentos',
        externalId: 'ext-123457',
      };

      const existingOrder = {
        id: 1,
        publicCode: 'OS-001-20251209',
        status: WorkOrderStatus.WAITING_APPROVAL,
      };

      const updatedOrder = {
        ...existingOrder,
        status: WorkOrderStatus.DIAGNOSING,
        deniedAt: expect.any(Date),
        denialReason: 'Aguardando esclarecimentos',
      };

      repository.findByPublicCode.mockResolvedValue(existingOrder);
      repository.updateStatus.mockResolvedValue(updatedOrder);

      const result = await useCase.execute(request);

      expect(repository.findByPublicCode).toHaveBeenCalledWith('OS-001-20251209');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        1,
        WorkOrderStatus.DIAGNOSING,
        expect.objectContaining({
          deniedAt: expect.any(Date),
          denialReason: 'Aguardando esclarecimentos',
        }),
      );
      expect(result.status).toBe(WorkOrderStatus.DIAGNOSING);
    });

    it('should throw BadRequestException if publicCode is missing', async () => {
      const request: any = {
        action: 'APPROVE',
      };

      await expect(useCase.execute(request)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if action is invalid', async () => {
      const request: any = {
        publicCode: 'OS-001-20251209',
        action: 'INVALID_ACTION',
      };

      await expect(useCase.execute(request)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if work order does not exist', async () => {
      const request: ApproveViaWebhookRequest = {
        publicCode: 'OS-999-20251209',
        action: 'APPROVE',
      };

      repository.findByPublicCode.mockResolvedValue(null);

      await expect(useCase.execute(request)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if work order is not waiting approval', async () => {
      const request: ApproveViaWebhookRequest = {
        publicCode: 'OS-001-20251209',
        action: 'APPROVE',
      };

      const existingOrder = {
        id: 1,
        publicCode: 'OS-001-20251209',
        status: WorkOrderStatus.IN_PROGRESS,
      };

      repository.findByPublicCode.mockResolvedValue(existingOrder);

      await expect(useCase.execute(request)).rejects.toThrow(BadRequestException);
    });

    it('should use default deny reason if not provided', async () => {
      const request: ApproveViaWebhookRequest = {
        publicCode: 'OS-001-20251209',
        action: 'DENY',
        // sem reason
      };

      const existingOrder = {
        id: 1,
        publicCode: 'OS-001-20251209',
        status: WorkOrderStatus.WAITING_APPROVAL,
      };

      repository.findByPublicCode.mockResolvedValue(existingOrder);
      repository.updateStatus.mockResolvedValue({
        ...existingOrder,
        status: WorkOrderStatus.DIAGNOSING,
      });

      await useCase.execute(request);

      expect(repository.updateStatus).toHaveBeenCalledWith(
        1,
        WorkOrderStatus.DIAGNOSING,
        expect.objectContaining({
          denialReason: 'Recusado externamente',
        }),
      );
    });
  });
});
