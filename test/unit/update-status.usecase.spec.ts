import { UpdateStatusUseCase } from '@/modules/workorders/application/update-status.usecase';
import { WorkOrderStatus } from '@/modules/workorders/domain/entities';

describe('UpdateStatusUseCase', () => {
  it('throws when order not found', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const usecase = new UpdateStatusUseCase(repo);
    await expect(usecase.execute(1, WorkOrderStatus.DIAGNOSING)).rejects.toThrow();
  });

  it('throws on invalid transition', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue({ id: 1, status: 'RECEIVED' }) };
    const usecase = new UpdateStatusUseCase(repo);
    await expect(usecase.execute(1, WorkOrderStatus.IN_PROGRESS)).rejects.toThrow();
  });

  it('updates when valid transition', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue({ id: 1, status: 'RECEIVED' }), updateStatus: jest.fn().mockResolvedValue({ id: 1, status: 'DIAGNOSING' }) };
    const usecase = new UpdateStatusUseCase(repo);
    const res = await usecase.execute(1, WorkOrderStatus.DIAGNOSING);
    expect(repo.updateStatus).toHaveBeenCalledWith(1, 'DIAGNOSING');
    expect(res.status).toBe('DIAGNOSING');
  });
});
