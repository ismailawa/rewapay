import type { Request } from 'express';
import { CrayAdminControllerBase } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import type { CrayAuthorizationContext } from '../controllers';

class TestAdminController extends CrayAdminControllerBase {
  readonly authorizeMock = jest.fn<void, [CrayAuthorizationContext]>();

  constructor(service: ReconciliationService) {
    super(service);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    this.authorizeMock(context);
  }
}

describe('CrayAdminControllerBase', () => {
  const request = {} as Request;
  let controller: TestAdminController;
  let service: jest.Mocked<ReconciliationService>;

  beforeEach(() => {
    service = {
      getPlatformBalance: jest.fn(),
      snapshotPlatformBalance: jest.fn(),
      reconcilePendingTransactions: jest.fn(),
    } as unknown as jest.Mocked<ReconciliationService>;
    controller = new TestAdminController(service);
  });

  it('authorizes balance reads and snapshots separately', async () => {
    service.getPlatformBalance.mockResolvedValueOnce({
      currency: 'NGN', available: '25000.00', ledger: '25000.00',
    });
    service.snapshotPlatformBalance.mockResolvedValueOnce({
      id: 'snap_01', currency: 'NGN', availableBalance: '25000.00', createdAt: new Date(),
    } as never);

    await controller.getBalance('NGN', request);
    await controller.snapshotBalance(request, 'NGN');

    expect(controller.authorizeMock).toHaveBeenNthCalledWith(1, {
      operation: 'admin.balance.read', request, resource: { currency: 'NGN' },
    });
    expect(controller.authorizeMock).toHaveBeenNthCalledWith(2, {
      operation: 'admin.balance.snapshot', request, resource: { currency: 'NGN' },
    });
  });

  it('authorizes reconciliation before invoking the admin operation', async () => {
    service.reconcilePendingTransactions.mockResolvedValueOnce({
      totalProcessed: 5, resolvedCount: 3, stuckCount: 1, records: [],
    });

    await controller.runReconciliation(request, '5', '45');

    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'admin.reconciliation.run', request, resource: {},
    });
    expect(service.reconcilePendingTransactions).toHaveBeenCalledWith(5, 45);
  });
});
