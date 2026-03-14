import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SecureWebhookApprovalUseCase } from '../../src/modules/workorders/application/secure-webhook-approval.usecase';
import { WebhookApprovalRequestDto, WebhookApprovalAction } from '../../src/modules/workorders/dto/webhook-approval-request.dto';

// WorkOrderStatus é um enum string do Prisma
enum WorkOrderStatus {
  RECEIVED = 'RECEIVED',
  DIAGNOSING = 'DIAGNOSING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  DELIVERED = 'DELIVERED',
}

describe('SecureWebhookApprovalUseCase', () => {
  let useCase: SecureWebhookApprovalUseCase;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findByPublicCode: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        SecureWebhookApprovalUseCase,
        { provide: 'WorkOrderRepository', useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<SecureWebhookApprovalUseCase>(SecureWebhookApprovalUseCase);
  });

  describe('Validação e segurança', () => {
    it('deve rejeitar requisição sem token válido', async () => {
      const dto: WebhookApprovalRequestDto = {
        publicCode: 'test-code',
        action: WebhookApprovalAction.APPROVE,
      };

      await expect(useCase.execute(dto, false)).rejects.toThrow(UnauthorizedException);
    });

    it('deve rejeitar requisição sem publicCode', async () => {
      const dto: WebhookApprovalRequestDto = {
        publicCode: '',
        action: WebhookApprovalAction.APPROVE,
      };

      await expect(useCase.execute(dto, true)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar requisição com action inválido', async () => {
      const dto: any = {
        publicCode: 'test-code',
        action: 'INVALID',
      };

      await expect(useCase.execute(dto, true)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException se OS não existe', async () => {
      mockRepo.findByPublicCode.mockResolvedValue(null);

      const dto: WebhookApprovalRequestDto = {
        publicCode: 'nonexistent',
        action: WebhookApprovalAction.APPROVE,
      };

      await expect(useCase.execute(dto, true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Transições de estado', () => {
    it('deve aprovar OS no estado WAITING_APPROVAL', async () => {
      mockRepo.findByPublicCode.mockResolvedValue({
        id: 1,
        publicCode: 'test-code',
        status: WorkOrderStatus.WAITING_APPROVAL,
      });

      mockRepo.updateStatus.mockResolvedValue({
        id: 1,
        status: WorkOrderStatus.IN_PROGRESS,
        approvedAt: expect.any(Date),
      });

      const dto: WebhookApprovalRequestDto = {
        publicCode: 'test-code',
        action: WebhookApprovalAction.APPROVE,
        externalId: 'ext-123',
      };

      const result = await useCase.execute(dto, true);

      expect(result.status).toBe(WorkOrderStatus.IN_PROGRESS);
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        1,
        WorkOrderStatus.IN_PROGRESS,
        expect.objectContaining({
          approvedAt: expect.any(Date),
          approvedBy: 'webhook-ext-123',
        }),
      );
    });

    it('deve negar OS no estado WAITING_APPROVAL', async () => {
      mockRepo.findByPublicCode.mockResolvedValue({
        id: 1,
        publicCode: 'test-code',
        status: WorkOrderStatus.WAITING_APPROVAL,
      });

      mockRepo.updateStatus.mockResolvedValue({
        id: 1,
        status: WorkOrderStatus.DIAGNOSING,
        deniedAt: expect.any(Date),
      });

      const dto: WebhookApprovalRequestDto = {
        publicCode: 'test-code',
        action: WebhookApprovalAction.DENY,
        reason: 'Cliente solicitou ajuste',
        externalId: 'ext-456',
      };

      const result = await useCase.execute(dto, true);

      expect(result.status).toBe(WorkOrderStatus.DIAGNOSING);
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        1,
        WorkOrderStatus.DIAGNOSING,
        expect.objectContaining({
          deniedAt: expect.any(Date),
          denialReason: 'Cliente solicitou ajuste',
          deniedBy: 'webhook-ext-456',
        }),
      );
    });

    it('deve retornar resultado idempotente se OS já foi aprovada', async () => {
      mockRepo.findByPublicCode.mockResolvedValue({
        id: 1,
        publicCode: 'test-code',
        status: WorkOrderStatus.IN_PROGRESS, // Já aprovada
      });

      const dto: WebhookApprovalRequestDto = {
        publicCode: 'test-code',
        action: WebhookApprovalAction.APPROVE,
      };

      const result = await useCase.execute(dto, true);

      expect(result.message).toBe('OS já estava aprovada');
      expect(result.status).toBe(WorkOrderStatus.IN_PROGRESS);
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('deve rejeitar aprovação se OS não está aguardando e não foi aprovada', async () => {
      mockRepo.findByPublicCode.mockResolvedValue({
        id: 1,
        publicCode: 'test-code',
        status: WorkOrderStatus.DIAGNOSING, // Voltou ao diagnóstico (recusada)
        deniedAt: new Date(),
      });

      const dto: WebhookApprovalRequestDto = {
        publicCode: 'test-code',
        action: WebhookApprovalAction.APPROVE,
      };

      await expect(useCase.execute(dto, true)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Idempotência', () => {
    it('deve retornar resultado idempotentemente para aprovação duplicada', async () => {
      mockRepo.findByPublicCode.mockResolvedValue({
        id: 1,
        publicCode: 'test-code',
        status: WorkOrderStatus.IN_PROGRESS, // Já aprovada
      });

      const dto: WebhookApprovalRequestDto = {
        publicCode: 'test-code',
        action: WebhookApprovalAction.APPROVE,
        idempotencyKey: 'idem-123',
      };

      const result = await useCase.execute(dto, true);

      expect(result.message).toBe('OS já estava aprovada');
      expect(result.id).toBe(1);
    });

    it('deve retornar resultado idempotentemente para negação duplicada', async () => {
      mockRepo.findByPublicCode.mockResolvedValue({
        id: 1,
        publicCode: 'test-code',
        status: WorkOrderStatus.DIAGNOSING,
        deniedAt: new Date(), // Já recusada
      });

      const dto: WebhookApprovalRequestDto = {
        publicCode: 'test-code',
        action: WebhookApprovalAction.DENY,
        idempotencyKey: 'idem-456',
      };

      const result = await useCase.execute(dto, true);

      expect(result.message).toBe('OS já estava recusada');
      expect(result.id).toBe(1);
    });

    it('deve usar externalId como chave de idempotência se idempotencyKey não fornecida', async () => {
      mockRepo.findByPublicCode.mockResolvedValue({
        id: 1,
        publicCode: 'test-code',
        status: WorkOrderStatus.WAITING_APPROVAL,
      });

      mockRepo.updateStatus.mockResolvedValue({
        id: 1,
        status: WorkOrderStatus.IN_PROGRESS,
      });

      const dto: WebhookApprovalRequestDto = {
        publicCode: 'test-code',
        action: WebhookApprovalAction.APPROVE,
        externalId: 'ext-789',
      };

      // Primeira chamada
      const result1 = await useCase.execute(dto, true);
      expect(result1.status).toBe(WorkOrderStatus.IN_PROGRESS);

      // Segunda chamada com mesmo externalId (sem chamar repo novamente)
      mockRepo.updateStatus.mockClear();
      const dto2 = { ...dto, externalId: 'ext-789' };
      const result2 = await useCase.execute(dto2, true);

      // Deve retornar resultado cacheado
      expect(result2.status).toBe(WorkOrderStatus.IN_PROGRESS);
      expect(mockRepo.updateStatus).not.toHaveBeenCalled(); // Não deve chamar repo novamente
    });
  });
});
