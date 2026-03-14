import { SubmitForApprovalUseCase } from '@/modules/workorders/application/submit-for-approval.usecase';

describe('SubmitForApprovalUseCase', () => {
  it('should throw if order not found', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const notifier: any = { sendEstimate: jest.fn() };
    const usecase = new SubmitForApprovalUseCase(repo, notifier);
    await expect(usecase.execute(1, 'user')).rejects.toThrow();
  });

  it('should send estimate and update status', async () => {
    const order = { id: 1, status: 'DIAGNOSING', customerId: 2 } as any;
    const repo: any = { findById: jest.fn().mockResolvedValue(order), updateStatus: jest.fn().mockResolvedValue({ ...order, status: 'WAITING_APPROVAL' }) };
    const notifier: any = { sendEstimate: jest.fn().mockResolvedValue(undefined) };
    const usecase = new SubmitForApprovalUseCase(repo, notifier);
    const res = await usecase.execute(1, 'user');
    expect(notifier.sendEstimate).toHaveBeenCalled();
    expect(repo.updateStatus).toHaveBeenCalledWith(1, 'WAITING_APPROVAL');
    expect(res.status).toBe('WAITING_APPROVAL');
  });
});
