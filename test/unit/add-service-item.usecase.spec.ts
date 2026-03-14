import { AddServiceItemUseCase } from '@/modules/workorders/application/add-service-item.usecase';

describe('AddServiceItemUseCase', () => {
  it('throws when service invalid', async () => {
    const repo: any = { getServiceById: jest.fn().mockResolvedValue(null) };
    const usecase = new AddServiceItemUseCase(repo);
    await expect(usecase.execute(1, 1, 2)).rejects.toThrow();
  });

  it('calls repo.addServiceItem with computed total', async () => {
    const svc = { id: 1, unitPrice: '10', active: true };
    const repo: any = { getServiceById: jest.fn().mockResolvedValue(svc), addServiceItem: jest.fn().mockResolvedValue(undefined) };
    const usecase = new AddServiceItemUseCase(repo);
    await usecase.execute(1, 1, 3);
    expect(repo.addServiceItem).toHaveBeenCalledWith(1, { serviceId: 1, qty: 3, unitPrice: '10', total: '30' });
  });
});
