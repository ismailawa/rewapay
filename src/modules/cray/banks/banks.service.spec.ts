import { Test, TestingModule } from '@nestjs/testing';
import { BanksService } from './banks.service';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import { TEST_CRAY_OPTIONS } from '../testing/test-options';

describe('BanksService', () => {
  let service: BanksService;
  let apiClient: jest.Mocked<CrayApiClient>;

  beforeEach(async () => {
    const mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BanksService,
        { provide: CRAY_MODULE_OPTIONS, useValue: TEST_CRAY_OPTIONS },
        {
          provide: CrayApiClient,
          useValue: mockApiClient,
        },
      ],
    }).compile();

    service = module.get<BanksService>(BanksService);
    apiClient = module.get(CrayApiClient);
  });

  describe('listBanks', () => {
    it('should fetch and normalize bank directory from Cray API', async () => {
      apiClient.get.mockResolvedValueOnce({
        success: true,
        data: [
          {
            bank_name: 'ACCESS BANK PLC',
            short_code: '000014',
            bank_code: '000014',
            institutionCode: '000014',
            institutionName: 'ACCESS BANK PLC',
          },
          {
            bank_name: 'GTBANK',
            bank_code: '000013',
          },
        ],
      });

      const banks = await service.listBanks();
      expect(banks.length).toBe(2);
      expect(banks[0]).toEqual({ code: '000014', name: 'ACCESS BANK PLC' });
      expect(banks[1]).toEqual({ code: '000013', name: 'GTBANK' });
      expect(apiClient.get).toHaveBeenCalledWith('/payout/banks');
    });

    it('should return cached bank directory on subsequent call without extra HTTP request', async () => {
      apiClient.get.mockResolvedValueOnce({
        data: [{ bank_name: 'Wema Bank', bank_code: '035' }],
      });

      // First call
      const first = await service.listBanks();
      expect(first.length).toBe(1);

      // Second call
      const second = await service.listBanks();
      expect(second.length).toBe(1);
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should force refresh bank directory cache when forceRefresh=true', async () => {
      apiClient.get.mockResolvedValue({
        data: [{ bank_name: 'Wema Bank', bank_code: '035' }],
      });

      await service.listBanks();
      await service.listBanks(true);

      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateBankAccount', () => {
    it('should throw INVALID_INPUT if account number is not 10 digits', async () => {
      await expect(
        service.validateBankAccount({
          accountNumber: '12345',
          bankCode: '000013',
        }),
      ).rejects.toThrow(CrayException);

      try {
        await service.validateBankAccount({
          accountNumber: '12345',
          bankCode: '000013',
        });
      } catch (err) {
        expect((err as CrayException).code).toBe(CrayErrorCode.INVALID_INPUT);
      }
    });

    it('should successfully validate account and return account name with ref_id', async () => {
      apiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          account_number: '0123456789',
          account_name: 'JOHN DOE',
          ref_id: 'sess_6ad78ff6f128b30afd238964',
        },
        message: 'Action was Succesfull',
      });

      const result = await service.validateBankAccount({
        accountNumber: '0123456789',
        bankCode: '000013',
        customerId: 'cust_123',
      });

      expect(result.accountName).toBe('JOHN DOE');
      expect(result.refId).toBe('sess_6ad78ff6f128b30afd238964');
      expect(apiClient.post).toHaveBeenCalledWith(
        '/payout/accounts/validate',
        {
          account_number: '0123456789',
          bank_code: '000013',
        },
      );

      // Beneficiary should be saved
      const saved = await service.findBeneficiary('000013', '0123456789');
      expect(saved).toBeDefined();
      expect(saved?.accountName).toBe('JOHN DOE');
      expect(saved?.providerReference).toBe('sess_6ad78ff6f128b30afd238964');
    });

    it('should throw NOT_FOUND if account name could not be resolved', async () => {
      apiClient.post.mockResolvedValueOnce({
        success: false,
        data: null,
      });

      await expect(
        service.validateBankAccount({
          accountNumber: '0123456789',
          bankCode: '000013',
        }),
      ).rejects.toThrow(CrayException);
    });
  });
});
