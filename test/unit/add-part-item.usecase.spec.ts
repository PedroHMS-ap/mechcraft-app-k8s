import { AddPartItemUseCase } from '@/modules/workorders/application/add-part-item.usecase';

describe('AddPartItemUseCase', () => {
  it('throws when part invalid', async () => {
    const repo: any = { getPartById: jest.fn().mockResolvedValue(null) };
    const usecase = new AddPartItemUseCase(repo);
    await expect(usecase.execute(1, 1, 2)).rejects.toThrow();
  });

  it('throws when stock insufficient', async () => {
    const repo: any = { getPartById: jest.fn().mockResolvedValue({ id: 1, unitPrice: '5', active: true, stockQty: 1 }) };
    const usecase = new AddPartItemUseCase(repo);
    await expect(usecase.execute(1, 1, 2)).rejects.toThrow();
  });

  it('calls repo.addPartItem with computed total', async () => {
    const part = { id: 1, unitPrice: '5', active: true, stockQty: 10 };
    const repo: any = { getPartById: jest.fn().mockResolvedValue(part), addPartItem: jest.fn().mockResolvedValue(undefined) };
    const usecase = new AddPartItemUseCase(repo);
    await usecase.execute(1, 1, 4);
    expect(repo.addPartItem).toHaveBeenCalledWith(1, { partId: 1, qty: 4, unitPrice: '5', total: '20' });
  });
});
