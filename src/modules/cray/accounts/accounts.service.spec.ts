import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';

describe('AccountsService', () => {
  let service: AccountsService;
  let apiClient: jest.Mocked<CrayApiClient>;

  beforeEach(async () => {
    const mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: CrayApiClient,
          useValue: mockApiClient,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    apiClient = module.get(CrayApiClient);
  });

  describe('createVirtualAccount', () => {
    it('should throw INVALID_INPUT if mandatory fields are missing', async () => {
      await expect(
        service.createVirtualAccount({
          customerId: '',
          fullName: 'Test User',
          email: 'test@example.com',
          bvn: '12345678901',
        }),
      ).rejects.toThrow(CrayException);

      try {
        await service.createVirtualAccount({
          customerId: 'cust_1',
          fullName: 'Test User',
          email: 'test@example.com',
          bvn: '',
        });
      } catch (err) {
        expect((err as CrayException).code).toBe(CrayErrorCode.INVALID_INPUT);
      }
    });

    it('should successfully create virtual account when provider returns account array', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: true,
        data: [
          {
            accountNumber: '0123456789',
            accountName: 'Test User',
            bankName: 'Wema Bank',
            bankCode: '035',
          },
        ],
      });

      const result = await service.createVirtualAccount({
        customerId: 'cust_1',
        fullName: 'Test User',
        email: 'user@example.com',
        bvn: '22223333444',
      });

      expect(result.accountNumber).toBe('0123456789');
      expect(result.accountName).toBe('Test User');
      expect(result.bankName).toBe('Wema Bank');
      expect(result.bankCode).toBe('035');
      expect(result.status).toBe(CrayStatus.SUCCESSFUL);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/virtual-accounts/create',
        expect.objectContaining({
          currency: 'NGN',
          customer_email: 'user@example.com',
          bvn: '22223333444',
        }),
      );
    });

    it('should return status OTP_REQUIRED if provider response indicates OTP requirement', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: 'OTP_REQUIRED',
        message: 'OTP verification required for Wema Bank virtual account',
      });

      const result = await service.createVirtualAccount({
        customerId: 'cust_otp_1',
        fullName: 'OTP User',
        email: 'otpuser@example.com',
        bvn: '12345678901',
      });

      expect(result.status).toBe('OTP_REQUIRED');
      expect(result.bankName).toBe('Wema Bank');
      expect(result.accountNumber).toBe('');
    });

    it('should return existing active account on duplicate call without re-querying provider', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          accountNumber: '9988776655',
          accountName: 'Existing User',
          bankName: 'Providus Bank',
          bankCode: '101',
        },
      });

      // First call
      const first = await service.createVirtualAccount({
        customerId: 'cust_dup',
        fullName: 'Existing User',
        email: 'dup@example.com',
        bvn: '11122233344',
      });
      expect(first.accountNumber).toBe('9988776655');

      // Second call with same customerId
      const second = await service.createVirtualAccount({
        customerId: 'cust_dup',
        fullName: 'Existing User',
        email: 'dup@example.com',
        bvn: '11122233344',
      });

      expect(second.accountNumber).toBe('9988776655');
      // Provider should only have been called once
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('submitVirtualAccountOtp', () => {
    it('should successfully submit OTP and activate pending account', async () => {
      // 1. Setup pending OTP account
      apiClient.post.mockResolvedValueOnce({
        status: 'OTP_REQUIRED',
      });
      await service.createVirtualAccount({
        customerId: 'cust_otp_submit',
        fullName: 'OTP User',
        email: 'otp@example.com',
        bvn: '12345678901',
      });

      // 2. Submit OTP
      apiClient.post.mockResolvedValueOnce({
        success: true,
        message: 'Action was Successful',
      });

      const otpResult = await service.submitVirtualAccountOtp({
        customerId: 'cust_otp_submit',
        otp: '123456',
      });

      expect(otpResult.status).toBe(CrayStatus.SUCCESSFUL);
      expect(apiClient.post).toHaveBeenLastCalledWith(
        '/api/virtual-accounts/generate-wallet',
        {
          otp: '123456',
          customer_email: 'otp@example.com',
        },
      );
    });

    it('should throw NOT_FOUND if customer does not exist', async () => {
      await expect(
        service.submitVirtualAccountOtp({
          customerId: 'non_existent_customer',
          otp: '123456',
        }),
      ).rejects.toThrow(CrayException);
    });
  });

  describe('getVirtualAccount', () => {
    it('should return null if customer has no account', async () => {
      const result = await service.getVirtualAccount('unknown_cust');
      expect(result).toBeNull();
    });

    it('should return account details if customer has an account', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          accountNumber: '1122334455',
          accountName: 'Retrieved User',
          bankName: 'Access Bank',
          bankCode: '044',
        },
      });

      await service.createVirtualAccount({
        customerId: 'cust_retrieve',
        fullName: 'Retrieved User',
        email: 'ret@example.com',
        bvn: '12345678901',
      });

      const details = await service.getVirtualAccount('cust_retrieve');
      expect(details).toBeDefined();
      expect(details?.accountNumber).toBe('1122334455');
      expect(details?.bankName).toBe('Access Bank');
      expect(details?.currency).toBe('NGN');
    });
  });
});

