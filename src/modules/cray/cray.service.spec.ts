import { Test, TestingModule } from '@nestjs/testing';
import { CrayService } from './cray.service';
import { AccountsService } from './accounts/accounts.service';
import { BanksService } from './banks/banks.service';
import { TransfersService } from './transfers/transfers.service';
import { CheckoutService } from './checkout/checkout.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { IdempotencyService } from './idempotency/idempotency.service';
import { CrayErrorCode, CrayStatus } from './enums/cray.enums';
import { CrayException } from './interfaces/cray.interfaces';

describe('CrayService (Unified Facade)', () => {
  let service: CrayService;
  let accountsService: jest.Mocked<AccountsService>;
  let banksService: jest.Mocked<BanksService>;
  let transfersService: jest.Mocked<TransfersService>;
  let checkoutService: jest.Mocked<CheckoutService>;
  let reconciliationService: jest.Mocked<ReconciliationService>;
  let idempotencyService: IdempotencyService;

  beforeEach(async () => {
    const mockAccountsService = {
      createVirtualAccount: jest.fn(),
      submitVirtualAccountOtp: jest.fn(),
      getVirtualAccount: jest.fn(),
    };

    const mockBanksService = {
      listBanks: jest.fn(),
      validateBankAccount: jest.fn(),
    };

    const mockTransfersService = {
      initiateTransfer: jest.fn(),
      getTransferStatus: jest.fn(),
    };

    const mockCheckoutService = {
      createCheckoutSession: jest.fn(),
      getCheckoutStatus: jest.fn(),
    };

    const mockReconciliationService = {
      getPlatformBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrayService,
        IdempotencyService,
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: BanksService, useValue: mockBanksService },
        { provide: TransfersService, useValue: mockTransfersService },
        { provide: CheckoutService, useValue: mockCheckoutService },
        { provide: ReconciliationService, useValue: mockReconciliationService },
      ],
    }).compile();

    service = module.get<CrayService>(CrayService);
    accountsService = module.get(AccountsService);
    banksService = module.get(BanksService);
    transfersService = module.get(TransfersService);
    checkoutService = module.get(CheckoutService);
    reconciliationService = module.get(ReconciliationService);
    idempotencyService = module.get(IdempotencyService);
  });

  // =====================================================================
  // Virtual Accounts
  // =====================================================================

  describe('virtual accounts operations', () => {
    it('should forward createVirtualAccount to accountsService', async () => {
      accountsService.createVirtualAccount.mockResolvedValueOnce({
        accountNumber: '1234567890',
        accountName: 'John Doe',
        bankName: 'Wema Bank',
        bankCode: '035',
        status: CrayStatus.SUCCESSFUL,
      });

      const result = await service.createVirtualAccount({
        customerId: 'cust_01',
        fullName: 'John Doe',
        email: 'john@example.com',
        bvn: '22222222222',
      });

      expect(result.accountNumber).toBe('1234567890');
      expect(accountsService.createVirtualAccount).toHaveBeenCalledTimes(1);
    });

    it('should forward submitVirtualAccountOtp to accountsService', async () => {
      accountsService.submitVirtualAccountOtp.mockResolvedValueOnce({
        status: CrayStatus.SUCCESSFUL,
      });

      const result = await service.submitVirtualAccountOtp({
        customerId: 'cust_01',
        otp: '123456',
      });

      expect(result.status).toBe(CrayStatus.SUCCESSFUL);
      expect(accountsService.submitVirtualAccountOtp).toHaveBeenCalledTimes(1);
    });

    it('should forward getVirtualAccount to accountsService', async () => {
      accountsService.getVirtualAccount.mockResolvedValueOnce({
        customerId: 'cust_01',
        accountNumber: '1234567890',
        accountName: 'John Doe',
        bankName: 'Wema Bank',
        currency: 'NGN',
        status: CrayStatus.SUCCESSFUL,
        createdAt: '2026-11-10T10:00:00Z',
      });

      const result = await service.getVirtualAccount('cust_01');
      expect(result?.accountNumber).toBe('1234567890');
      expect(accountsService.getVirtualAccount).toHaveBeenCalledWith('cust_01');
    });
  });

  // =====================================================================
  // Funding Sessions / Collections
  // =====================================================================

  describe('funding session operations', () => {
    it('should create funding session via checkoutService with idempotency lock', async () => {
      checkoutService.createCheckoutSession.mockResolvedValueOnce({
        sessionId: 'PAY_123',
        paymentUrl: 'https://checkout.crayfi.com/pay/PAY_123',
        expiresAt: '',
      });

      const result = await service.createFundingSession({
        customerId: 'cust_01',
        walletId: 'wal_01',
        amount: '2500.00',
        reference: 'funding_ref_001',
        method: 'transfer',
      });

      expect(result.paymentUrl).toBe('https://checkout.crayfi.com/pay/PAY_123');
      expect(checkoutService.createCheckoutSession).toHaveBeenCalledTimes(1);

      // Replay with identical payload and reference — should return cached without re-invoking
      const replay = await service.createFundingSession({
        customerId: 'cust_01',
        walletId: 'wal_01',
        amount: '2500.00',
        reference: 'funding_ref_001',
        method: 'transfer',
      });

      expect(replay.paymentUrl).toBe('https://checkout.crayfi.com/pay/PAY_123');
      expect(checkoutService.createCheckoutSession).toHaveBeenCalledTimes(1);
    });

    it('should throw INVALID_INPUT if funding session params are missing', async () => {
      await expect(
        service.createFundingSession({
          customerId: '',
          walletId: 'wal_01',
          amount: '1000',
          reference: 'ref_1',
          method: 'card',
        }),
      ).rejects.toThrow(CrayException);
    });

    it('should forward getFundingStatus to checkoutService', async () => {
      checkoutService.getCheckoutStatus.mockResolvedValueOnce({
        status: CrayStatus.SUCCESSFUL,
        amount: '2500.00',
        confirmedAt: '2026-11-10T12:00:00Z',
      });

      const result = await service.getFundingStatus('funding_ref_001');
      expect(result.status).toBe(CrayStatus.SUCCESSFUL);
      expect(checkoutService.getCheckoutStatus).toHaveBeenCalledWith('funding_ref_001');
    });
  });

  // =====================================================================
  // Bank Directory & Validation
  // =====================================================================

  describe('banks operations', () => {
    it('should forward listBanks to banksService', async () => {
      banksService.listBanks.mockResolvedValueOnce([
        { code: '035', name: 'Wema Bank' },
        { code: '058', name: 'Guaranty Trust Bank' },
      ]);

      const banks = await service.listBanks();
      expect(banks).toHaveLength(2);
      expect(banksService.listBanks).toHaveBeenCalledTimes(1);
    });

    it('should forward validateBankAccount to banksService', async () => {
      banksService.validateBankAccount.mockResolvedValueOnce({
        accountName: 'Jane Smith',
        refId: 'val_ref_01',
      });

      const result = await service.validateBankAccount({
        accountNumber: '0123456789',
        bankCode: '058',
      });

      expect(result.accountName).toBe('Jane Smith');
      expect(banksService.validateBankAccount).toHaveBeenCalledWith({
        accountNumber: '0123456789',
        bankCode: '058',
      });
    });
  });

  // =====================================================================
  // Disbursements / Transfers
  // =====================================================================

  describe('transfers operations', () => {
    it('should initiate transfer with idempotency protection', async () => {
      transfersService.initiateTransfer.mockResolvedValueOnce({
        transferId: 'trf_001',
        status: CrayStatus.PENDING,
      });

      const input = {
        walletId: 'wal_01',
        amount: '10000.00',
        reference: 'payout_ref_001',
        destination: {
          accountNumber: '0123456789',
          bankCode: '058',
          accountName: 'Jane Smith',
        },
      };

      const result = await service.initiateTransfer(input);
      expect(result.transferId).toBe('trf_001');
      expect(transfersService.initiateTransfer).toHaveBeenCalledTimes(1);

      // Replay with identical input — cached response
      const replay = await service.initiateTransfer(input);
      expect(replay.transferId).toBe('trf_001');
      expect(transfersService.initiateTransfer).toHaveBeenCalledTimes(1);
    });

    it('should forward getTransferStatus to transfersService', async () => {
      transfersService.getTransferStatus.mockResolvedValueOnce({
        status: CrayStatus.SUCCESSFUL,
        amount: '10000.00',
      });

      const result = await service.getTransferStatus('payout_ref_001');
      expect(result.status).toBe(CrayStatus.SUCCESSFUL);
      expect(transfersService.getTransferStatus).toHaveBeenCalledWith('payout_ref_001');
    });
  });

  // =====================================================================
  // Refunds (Deferred to Phase 2)
  // =====================================================================

  describe('refunds', () => {
    it('should throw NOT_SUPPORTED when refunds are disabled (Phase 2)', async () => {
      delete process.env.CRAY_ENABLE_REFUNDS;

      await expect(
        service.initiateRefund({ reference: 'ref_001', amount: '500.00' }),
      ).rejects.toThrow(CrayException);

      const err = await service
        .initiateRefund({ reference: 'ref_001', amount: '500.00' })
        .catch((e) => e);

      expect(err.code).toBe(CrayErrorCode.NOT_SUPPORTED);
    });
  });

  // =====================================================================
  // Platform Balance
  // =====================================================================

  describe('platform balance', () => {
    it('should forward getPlatformBalance to reconciliationService', async () => {
      reconciliationService.getPlatformBalance.mockResolvedValueOnce({
        currency: 'NGN',
        available: '100000.00',
        ledger: '105000.00',
      });

      const result = await service.getPlatformBalance('NGN');
      expect(result.available).toBe('100000.00');
      expect(reconciliationService.getPlatformBalance).toHaveBeenCalledWith('NGN');
    });
  });
});
