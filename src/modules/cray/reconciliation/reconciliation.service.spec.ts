import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayStatus } from '../enums/cray.enums';
import { CrayTransfer } from '../entities/cray-transfer.entity';
import { CrayCheckout } from '../entities/cray-checkout.entity';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let apiClient: jest.Mocked<CrayApiClient>;

  beforeEach(async () => {
    const mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: CrayApiClient, useValue: mockApiClient },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    apiClient = module.get(CrayApiClient);
  });

  // =====================================================================
  // Platform Balance Operations
  // =====================================================================

  describe('getPlatformBalance', () => {
    it('should fetch balance from GET /api/balance and format to strict 2-decimal string', async () => {
      apiClient.get.mockResolvedValueOnce({
        status: 'success',
        message: 'Account balance retrieved successfully',
        data: [
          {
            id: 'uuid-1',
            account_name: 'Main Account',
            currency: 'NGN',
            available_balance: 50000.5,
            actual_balance: 55000.5,
            locked_balance: 5000,
          },
        ],
      });

      const result = await service.getPlatformBalance('NGN');

      expect(apiClient.get).toHaveBeenCalledWith('/api/balance');
      expect(result).toEqual({
        currency: 'NGN',
        available: '50000.50',
        ledger: '55000.50',
      });
    });

    it('should handle single object balance data response', async () => {
      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: {
          currency: 'NGN',
          available_balance: 12000,
          ledger_balance: 12000,
        },
      });

      const result = await service.getPlatformBalance('NGN');
      expect(result.available).toBe('12000.00');
    });
  });

  describe('snapshotPlatformBalance', () => {
    it('should create and store persistent balance snapshot', async () => {
      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: [
          {
            id: 'acc_ngn_01',
            currency: 'NGN',
            available_balance: 75000,
            actual_balance: 80000,
            locked_balance: 5000,
          },
        ],
      });

      const snapshot = await service.snapshotPlatformBalance('NGN');

      expect(snapshot.currency).toBe('NGN');
      expect(snapshot.availableBalance).toBe('75000.00');
      expect(snapshot.ledgerBalance).toBe('80000.00');
      expect(snapshot.lockedBalance).toBe('5000.00');
      expect(snapshot.providerAccountId).toBe('acc_ngn_01');
    });
  });

  // =====================================================================
  // Reconciliation Cycle (Requery & Stuck Detection)
  // =====================================================================

  describe('reconcilePendingTransactions', () => {
    it('should requery pending transfer and resolve when provider confirms approved', async () => {
      // Seed a transfer created 5 minutes ago (older than 3m, not stuck > 30m)
      const transfer = {
        reference: 'recon_transfer_001',
        providerTransferReference: 'cray_transfer_001',
        status: CrayStatus.PENDING,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5m ago
      } as CrayTransfer;
      service.seedTransfer(transfer);

      // Cray requery returns approved
      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: {
          status: 'approved',
          reference: 'recon_transfer_001',
        },
      });

      const report = await service.reconcilePendingTransactions(3, 30);

      expect(report.totalProcessed).toBe(1);
      expect(report.resolvedCount).toBe(1);
      expect(report.stuckCount).toBe(0);
      expect(apiClient.get).toHaveBeenCalledWith('/api/payout/requery/cray_transfer_001');
      expect(transfer.status).toBe(CrayStatus.SUCCESSFUL);
    });

    it('should requery pending checkout and resolve to FAILED on provider failure', async () => {
      const checkout = {
        reference: 'recon_checkout_001',
        payCode: 'PAYCODE_001',
        status: CrayStatus.PENDING,
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10m ago
      } as CrayCheckout;
      service.seedCheckout(checkout);

      // Cray checkout query returns failed
      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: {
          status: 'failed',
          reference: 'recon_checkout_001',
        },
      });

      const report = await service.reconcilePendingTransactions(3, 30);

      expect(report.totalProcessed).toBe(1);
      expect(report.resolvedCount).toBe(1);
      expect(apiClient.get).toHaveBeenCalledWith('/api/checkout/query/PAYCODE_001');
      expect(checkout.status).toBe(CrayStatus.FAILED);
    });

    it('should flag transactions stuck in PENDING for > 30 minutes for manual review', async () => {
      // Seed a transfer created 45 minutes ago (stuck > 30m)
      const stuckTransfer = {
        reference: 'stuck_transfer_002',
        status: CrayStatus.PENDING,
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45m ago
      } as CrayTransfer;
      service.seedTransfer(stuckTransfer);

      const report = await service.reconcilePendingTransactions(3, 30);

      expect(report.totalProcessed).toBe(1);
      expect(report.stuckCount).toBe(1);
      expect(report.records[0]).toEqual(
        expect.objectContaining({
          reference: 'stuck_transfer_002',
          type: 'TRANSFER',
          flaggedForReview: true,
          newStatus: 'REQUIRES_MANUAL_REVIEW',
        }),
      );
    });

    it('should tolerate provider requery network errors without throwing', async () => {
      const transfer = {
        reference: 'network_fail_transfer',
        status: CrayStatus.PENDING,
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      } as CrayTransfer;
      service.seedTransfer(transfer);

      apiClient.get.mockRejectedValueOnce(new Error('Gateway timeout'));

      const report = await service.reconcilePendingTransactions(3, 30);

      expect(report.totalProcessed).toBe(1);
      expect(report.resolvedCount).toBe(0);
      expect(transfer.status).toBe(CrayStatus.PENDING); // Preserves pending state
    });
  });
});
