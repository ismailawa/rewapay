import { Test, TestingModule } from '@nestjs/testing';
import { TransfersService } from './transfers.service';
import { BanksService } from '../banks/banks.service';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import { TEST_CRAY_OPTIONS } from '../testing/test-options';

describe('TransfersService', () => {
  let service: TransfersService;
  let apiClient: jest.Mocked<CrayApiClient>;
  let banksService: jest.Mocked<BanksService>;

  beforeEach(async () => {
    const mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const mockBanksService = {
      findBeneficiary: jest.fn(),
      validateBankAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        { provide: CRAY_MODULE_OPTIONS, useValue: TEST_CRAY_OPTIONS },
        {
          provide: CrayApiClient,
          useValue: mockApiClient,
        },
        {
          provide: BanksService,
          useValue: mockBanksService,
        },
      ],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
    apiClient = module.get(CrayApiClient);
    banksService = module.get(BanksService);
    banksService.validateBankAccount.mockResolvedValue({
      accountName: 'TEST RECIPIENT',
      refId: 'sess_123',
    });
  });

  describe('initiateTransfer', () => {
    const validTransferInput = {
      walletId: 'wallet_123',
      amount: '500.00',
      reference: 'ref_payout_001',
      destination: {
        accountNumber: '0123456789',
        bankCode: '000013',
        accountName: 'TEST RECIPIENT',
      },
      narration: 'Salary payout',
    };

    it('should successfully initiate payout when account is pre-validated with ref_id', async () => {
      banksService.validateBankAccount.mockResolvedValueOnce({
        accountName: 'TEST RECIPIENT',
        refId: 'sess_pre_validated_123',
      });
      banksService.findBeneficiary.mockResolvedValueOnce({
        id: 'ben_1',
        bankCode: '000013',
        accountNumber: '0123456789',
        accountName: 'TEST RECIPIENT',
        providerReference: 'sess_pre_validated_123',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      apiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          reference: '76F38215SRTXENH1759359170',
          amount: '500.00',
          charge: 50,
          status: 'pending',
          merchant_reference: 'ref_payout_001',
        },
        message: 'Action was successfull',
      });

      const result = await service.initiateTransfer(validTransferInput);

      expect(result.transferId).toBe('76F38215SRTXENH1759359170');
      expect(result.status).toBe(CrayStatus.PENDING);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/payout/disburse',
        expect.objectContaining({
          customer_reference: 'ref_payout_001',
          account_number: '0123456789',
          bank_code: '000013',
          amount: '500.00',
          recipient_name: 'TEST RECIPIENT',
          ref_id: 'sess_pre_validated_123',
          currency: 'NGN',
        }),
      );
    });

    it('should automatically validate beneficiary if not pre-validated and then disburse', async () => {
      banksService.findBeneficiary.mockResolvedValueOnce(null);
      banksService.validateBankAccount.mockResolvedValueOnce({
        accountName: 'TEST RECIPIENT',
        refId: 'sess_auto_validated_456',
      });

      apiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          reference: 'TRF_CRAY_9988',
          status: 'pending',
        },
      });

      const result = await service.initiateTransfer({
        ...validTransferInput,
        reference: 'ref_payout_auto_val',
      });

      expect(result.transferId).toBe('TRF_CRAY_9988');
      expect(banksService.validateBankAccount).toHaveBeenCalledWith({
        accountNumber: '0123456789',
        bankCode: '000013',
        customerId: undefined,
      });
      expect(apiClient.post).toHaveBeenCalledWith(
        '/payout/disburse',
        expect.objectContaining({
          ref_id: 'sess_auto_validated_456',
        }),
      );
    });

    it('should enforce idempotency and return original result on duplicate reference without re-calling Cray', async () => {
      banksService.findBeneficiary.mockResolvedValue({
        id: 'ben_1',
        bankCode: '000013',
        accountNumber: '0123456789',
        accountName: 'TEST RECIPIENT',
        providerReference: 'sess_123',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      apiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          reference: 'ORIGINAL_TX_123',
          status: 'pending',
        },
      });

      // First call
      const first = await service.initiateTransfer({
        ...validTransferInput,
        reference: 'idempotent_ref_dup',
      });
      expect(first.transferId).toBe('ORIGINAL_TX_123');

      // Second call with same reference
      const second = await service.initiateTransfer({
        ...validTransferInput,
        reference: 'idempotent_ref_dup',
      });

      expect(second.transferId).toBe('ORIGINAL_TX_123');
      expect(second.status).toBe(CrayStatus.PENDING);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('should preserve transaction as PENDING when a timeout occurs (Critical Timeout Rule)', async () => {
      banksService.findBeneficiary.mockResolvedValue({
        id: 'ben_1',
        bankCode: '000013',
        accountNumber: '0123456789',
        accountName: 'TEST RECIPIENT',
        providerReference: 'sess_123',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const timeoutError = new CrayException({
        code: CrayErrorCode.PROVIDER_UNAVAILABLE,
        message: 'Cray request timed out',
        retryable: true,
      });
      apiClient.post.mockRejectedValueOnce(timeoutError);

      const result = await service.initiateTransfer({
        ...validTransferInput,
        reference: 'ref_timeout_001',
      });

      // Transaction must NOT be marked as failed
      expect(result.status).toBe(CrayStatus.PENDING);

      const saved = await service.findByReference('ref_timeout_001');
      expect(saved?.status).toBe(CrayStatus.PENDING);
      expect(saved?.failureMessageSanitized).toContain('timed out');
    });

    it('should throw CrayException and mark FAILED on definitive rejection (e.g. Insufficient funds)', async () => {
      banksService.findBeneficiary.mockResolvedValue({
        id: 'ben_1',
        bankCode: '000013',
        accountNumber: '0123456789',
        accountName: 'TEST RECIPIENT',
        providerReference: 'sess_123',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rejectionError = new CrayException({
        code: CrayErrorCode.INSUFFICIENT_FUNDS,
        message: 'Insufficient balance to complete payout',
        retryable: false,
      });
      apiClient.post.mockRejectedValueOnce(rejectionError);

      await expect(
        service.initiateTransfer({
          ...validTransferInput,
          reference: 'ref_insufficient_funds',
        }),
      ).rejects.toThrow(CrayException);

      const saved = await service.findByReference('ref_insufficient_funds');
      expect(saved?.status).toBe(CrayStatus.FAILED);
      expect(saved?.failureCode).toBe(CrayErrorCode.INSUFFICIENT_FUNDS);
    });

    it('should reject invalid amount format (e.g. float or invalid string)', async () => {
      await expect(
        service.initiateTransfer({
          ...validTransferInput,
          amount: '100', // missing decimals
          reference: 'ref_bad_amt',
        }),
      ).rejects.toThrow(CrayException);
    });
  });

  describe('getTransferStatus', () => {
    it('should requery Cray API and update status to SUCCESSFUL when provider reports approved', async () => {
      // 1. Setup pending transfer
      banksService.findBeneficiary.mockResolvedValueOnce({
        id: 'ben_1',
        bankCode: '000013',
        accountNumber: '0123456789',
        accountName: 'TEST RECIPIENT',
        providerReference: 'sess_123',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      apiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          reference: 'TX_CRAY_REQUERY_TEST',
          status: 'pending',
        },
      });

      await service.initiateTransfer({
        walletId: 'wallet_1',
        amount: '1000.00',
        reference: 'ref_requery_success',
        destination: {
          accountNumber: '0123456789',
          bankCode: '000013',
          accountName: 'TEST RECIPIENT',
        },
      });

      // 2. Requery returns approved
      apiClient.get.mockResolvedValueOnce({
        success: true,
        data: {
          reference: 'TX_CRAY_REQUERY_TEST',
          status: 'approved',
          amount: '1000.00',
        },
      });

      const statusResult = await service.getTransferStatus('ref_requery_success');
      expect(statusResult.status).toBe(CrayStatus.SUCCESSFUL);
      expect(statusResult.amount).toBe('1000.00');
      expect(apiClient.get).toHaveBeenCalledWith('/payout/requery/TX_CRAY_REQUERY_TEST');
    });

    it('should update status to FAILED when requery reports failed', async () => {
      // 1. Setup pending transfer
      banksService.findBeneficiary.mockResolvedValueOnce({
        id: 'ben_1',
        bankCode: '000013',
        accountNumber: '0123456789',
        accountName: 'TEST RECIPIENT',
        providerReference: 'sess_123',
        verificationStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      apiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          reference: 'TX_CRAY_FAIL_TEST',
          status: 'pending',
        },
      });

      await service.initiateTransfer({
        walletId: 'wallet_1',
        amount: '200.00',
        reference: 'ref_requery_fail',
        destination: {
          accountNumber: '0123456789',
          bankCode: '000013',
          accountName: 'TEST RECIPIENT',
        },
      });

      // 2. Requery returns failed
      apiClient.get.mockResolvedValueOnce({
        success: true,
        data: {
          reference: 'TX_CRAY_FAIL_TEST',
          status: 'failed',
          failure_reason: 'Account frozen',
        },
      });

      const statusResult = await service.getTransferStatus('ref_requery_fail');
      expect(statusResult.status).toBe(CrayStatus.FAILED);
      expect(statusResult.failureReason).toBe('Account frozen');
    });

    it('should throw NOT_FOUND if transfer reference does not exist', async () => {
      await expect(service.getTransferStatus('non_existent_ref')).rejects.toThrow(
        CrayException,
      );
    });
  });
});
