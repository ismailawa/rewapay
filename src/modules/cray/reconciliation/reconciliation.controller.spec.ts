import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

describe('ReconciliationController', () => {
  let controller: ReconciliationController;
  let service: jest.Mocked<ReconciliationService>;

  beforeEach(async () => {
    const mockService = {
      getPlatformBalance: jest.fn(),
      snapshotPlatformBalance: jest.fn(),
      reconcilePendingTransactions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReconciliationController],
      providers: [{ provide: ReconciliationService, useValue: mockService }],
    }).compile();

    controller = module.get<ReconciliationController>(ReconciliationController);
    service = module.get(ReconciliationService);
  });

  it('should call getPlatformBalance on GET /cray/balance', async () => {
    service.getPlatformBalance.mockResolvedValueOnce({
      currency: 'NGN',
      available: '25000.00',
      ledger: '25000.00',
    });

    const result = await controller.getBalance('NGN');
    expect(result).toEqual({ currency: 'NGN', available: '25000.00', ledger: '25000.00' });
    expect(service.getPlatformBalance).toHaveBeenCalledWith('NGN');
  });

  it('should call snapshotPlatformBalance on POST /cray/balance/snapshot', async () => {
    service.snapshotPlatformBalance.mockResolvedValueOnce({
      id: 'snap_01',
      currency: 'NGN',
      availableBalance: '25000.00',
      createdAt: new Date(),
    } as any);

    const result = await controller.snapshotBalance('NGN');
    expect(result.availableBalance).toBe('25000.00');
    expect(service.snapshotPlatformBalance).toHaveBeenCalledWith('NGN');
  });

  it('should call reconcilePendingTransactions on POST /cray/reconciliation/run', async () => {
    service.reconcilePendingTransactions.mockResolvedValueOnce({
      totalProcessed: 5,
      resolvedCount: 3,
      stuckCount: 1,
      records: [],
    });

    const result = await controller.runReconciliation('5', '45');
    expect(result.totalProcessed).toBe(5);
    expect(service.reconcilePendingTransactions).toHaveBeenCalledWith(5, 45);
  });
});
