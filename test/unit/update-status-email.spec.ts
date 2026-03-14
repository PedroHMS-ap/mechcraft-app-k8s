import { WorkOrdersController } from '@/modules/workorders/workorders.controller';
import { WorkOrdersService } from '@/modules/workorders/workorders.service';
import { UpdateStatusUseCase } from '@/modules/workorders/application/update-status.usecase';
import { WorkOrderStatus } from '@/modules/workorders/domain/entities';

describe('WorkOrdersController - email/status endpoint', () => {
  it('atualiza status via código público e delega para use case', async () => {
    const svc = {
      publicByCode: jest.fn().mockResolvedValue({ id: 10, publicCode: 'OS-001' }),
    } as unknown as WorkOrdersService;
    const update = {
      execute: jest.fn().mockResolvedValue({ id: 10, status: WorkOrderStatus.IN_PROGRESS }),
    } as unknown as UpdateStatusUseCase;

    const controller = new WorkOrdersController(
      svc,
      {} as any,
      {} as any,
      {} as any,
      update,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await controller.updateStatusViaEmail({ publicCode: 'OS-001', status: WorkOrderStatus.IN_PROGRESS });

    expect(svc.publicByCode).toHaveBeenCalledWith('OS-001');
    expect(update.execute).toHaveBeenCalledWith(10, WorkOrderStatus.IN_PROGRESS);
    expect(result).toEqual({ id: 10, status: WorkOrderStatus.IN_PROGRESS });
  });
});
