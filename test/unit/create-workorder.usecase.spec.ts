import { CreateWorkOrderUseCase } from '@/modules/workorders/application/create-workorder.usecase';

describe('CreateWorkOrderUseCase', () => {
  it('should call service.create with correct data', async () => {
    const service: any = { create: jest.fn().mockResolvedValue({ id: 1, customerId: 2, vehicleId: 3 }) };
    const usecase = new CreateWorkOrderUseCase(service);
    const payload = { customerId: 2, vehicleId: 3, description: 'Inicial' } as any;
    const result = await usecase.execute(payload);
    expect(service.create).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: 1, customerId: 2, vehicleId: 3 });
  });
});
