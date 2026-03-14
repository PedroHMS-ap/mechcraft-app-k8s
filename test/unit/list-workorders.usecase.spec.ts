import { ListWorkOrdersUseCase } from '@/modules/workorders/application/list-workorders.usecase';
import { WorkOrderStatus } from '@/modules/workorders/domain/entities';

describe('ListWorkOrdersUseCase', () => {
  it('filters out finished and delivered when no status given and orders are ordered by priority then createdAt', async () => {
    const rows = [
      { id: 1, status: 'RECEIVED', createdAt: new Date('2025-01-02') },
      { id: 2, status: 'IN_PROGRESS', createdAt: new Date('2025-01-05') },
      { id: 3, status: 'WAITING_APPROVAL', createdAt: new Date('2025-01-01') },
      { id: 4, status: 'FINISHED', createdAt: new Date('2025-01-03') },
    ];
    const repo: any = { list: jest.fn().mockResolvedValue(rows) };
    const usecase = new ListWorkOrdersUseCase(repo);
    const res = await usecase.execute();
    expect(res.find((r: any) => r.id === 4)).toBeUndefined();
    expect(res[0].status).toBe('IN_PROGRESS');
  });
});
