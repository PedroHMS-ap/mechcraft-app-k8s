import { RemoveServiceItemUseCase } from '@/modules/workorders/application/remove-service-item.usecase';

describe('RemoveServiceItemUseCase', () => {
  it('calls repo.removeServiceItem', async () => {
    const repo: any = { removeServiceItem: jest.fn().mockResolvedValue(undefined) };
    const usecase = new RemoveServiceItemUseCase(repo);
    await usecase.execute(5);
    expect(repo.removeServiceItem).toHaveBeenCalledWith(5);
  });
});
