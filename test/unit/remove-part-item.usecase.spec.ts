import { RemovePartItemUseCase } from '@/modules/workorders/application/remove-part-item.usecase';

describe('RemovePartItemUseCase', () => {
  it('calls repo.removePartItem', async () => {
    const repo: any = { removePartItem: jest.fn().mockResolvedValue(undefined) };
    const usecase = new RemovePartItemUseCase(repo);
    await usecase.execute(8);
    expect(repo.removePartItem).toHaveBeenCalledWith(8);
  });
});
