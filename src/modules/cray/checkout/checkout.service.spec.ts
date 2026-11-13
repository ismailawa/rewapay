import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import { CrayApiClient } from '../clients/cray-api.client';
import { CrayErrorCode, CrayStatus } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let apiClient: jest.Mocked<CrayApiClient>;

  const validDto = {
    amount: 1000,
    currency: 'NGN',
    reference: 'checkout_ref_001',
    defaultPaymentMethod: 'transfer' as const,
    feeBearer: 'merchant' as const,
    customer: { name: 'Jane Doe', email: 'jane.doe@example.com' },
    narration: 'Payment for order #001',
    callback_url: 'https://example.com/callback',
  };

  beforeEach(async () => {
    const mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: CrayApiClient, useValue: mockApiClient },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    apiClient = module.get(CrayApiClient);
  });

  // =====================================================================
  // createCheckoutSession
  // =====================================================================

  describe('createCheckoutSession', () => {
    it('should initialize checkout and return payment link', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: true,
        message: 'Link generated successfully',
        data: {
          link: 'https://checkout.connectramp.com/pay/RHEZ2VYSJ5P3LQA',
          reference: 'checkout_ref_001',
          payCode: 'RHEZ2VYSJ5P3LQA',
        },
      });

      const result = await service.createCheckoutSession(validDto);

      expect(result.paymentUrl).toBe('https://checkout.connectramp.com/pay/RHEZ2VYSJ5P3LQA');
      expect(result.sessionId).toBe('RHEZ2VYSJ5P3LQA');
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/checkout/initialize',
        expect.objectContaining({
          amount: '1000.00',
          currency: 'NGN',
          reference: 'checkout_ref_001',
          defaultPaymentMethod: 'transfer',
          feeBearer: 'merchant',
          customer: { name: 'Jane Doe', email: 'jane.doe@example.com' },
          narration: 'Payment for order #001',
          callback_url: 'https://example.com/callback',
        }),
      );
    });

    it('should enforce idempotency and return original link on duplicate reference', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: true,
        data: {
          link: 'https://checkout.connectramp.com/pay/IDEMPOTENT123',
          reference: 'checkout_idempotent',
          payCode: 'IDEMPOTENT123',
        },
      });

      // First call
      const first = await service.createCheckoutSession({
        ...validDto,
        reference: 'checkout_idempotent',
      });
      expect(first.paymentUrl).toBe('https://checkout.connectramp.com/pay/IDEMPOTENT123');

      // Second call with same reference — should NOT call Cray again
      const second = await service.createCheckoutSession({
        ...validDto,
        reference: 'checkout_idempotent',
      });
      expect(second.paymentUrl).toBe('https://checkout.connectramp.com/pay/IDEMPOTENT123');
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('should require token when defaultPaymentMethod is "card"', async () => {
      await expect(
        service.createCheckoutSession({
          ...validDto,
          reference: 'checkout_card_no_token',
          defaultPaymentMethod: 'card',
          token: undefined,
        }),
      ).rejects.toThrow(CrayException);
    });

    it('should include token in payload when defaultPaymentMethod is "card" and token provided', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: true,
        data: {
          link: 'https://checkout.connectramp.com/pay/CARD_SESSION_01',
          reference: 'checkout_card_ref',
          payCode: 'CARD_SESSION_01',
        },
      });

      await service.createCheckoutSession({
        ...validDto,
        reference: 'checkout_card_ref',
        defaultPaymentMethod: 'card',
        token: 'subaccount_tok_abc123',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/checkout/initialize',
        expect.objectContaining({ token: 'subaccount_tok_abc123' }),
      );
    });

    it('should throw PROVIDER_ERROR if Cray does not return a link', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: true,
        data: { payCode: 'NO_LINK' }, // missing link
      });

      await expect(
        service.createCheckoutSession({ ...validDto, reference: 'checkout_no_link' }),
      ).rejects.toThrow(CrayException);
    });

    it('should reject invalid reference', async () => {
      await expect(
        service.createCheckoutSession({ ...validDto, reference: '' }),
      ).rejects.toThrow(CrayException);
    });

    it('should reject invalid amount (zero)', async () => {
      await expect(
        service.createCheckoutSession({ ...validDto, amount: 0, reference: 'checkout_zero' }),
      ).rejects.toThrow(CrayException);
    });
  });

  // =====================================================================
  // getCheckoutStatus
  // =====================================================================

  describe('getCheckoutStatus', () => {
    async function seedPendingCheckout(ref: string) {
      apiClient.post.mockResolvedValueOnce({
        status: true,
        data: {
          link: 'https://checkout.connectramp.com/pay/STATUS_TEST',
          reference: ref,
          payCode: 'STATUS_TEST_CODE',
        },
      });
      await service.createCheckoutSession({ ...validDto, reference: ref });
    }

    it('should query Cray and update status to SUCCESSFUL', async () => {
      await seedPendingCheckout('checkout_query_success');

      apiClient.get.mockResolvedValueOnce({
        status: true,
        message: 'Charge attempted',
        data: {
          status: 'Successful',
          reference: 'checkout_query_success',
          provider_reference: 'F6L2RN8TM7AHZ491SCGQ',
          amount: 1000,
          net_amount: 950,
          fee: 50,
          payment_channel: 'bank_transfer',
        },
      });

      const result = await service.getCheckoutStatus('checkout_query_success');
      expect(result.status).toBe(CrayStatus.SUCCESSFUL);
      expect(result.amount).toBe('1000.00');
      expect(result.confirmedAt).toBeDefined();
      expect(apiClient.get).toHaveBeenCalledWith('/api/checkout/query/STATUS_TEST_CODE');
    });

    it('should map provider "failed" to FAILED status', async () => {
      await seedPendingCheckout('checkout_query_fail');

      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: {
          status: 'failed',
          reference: 'checkout_query_fail',
        },
      });

      const result = await service.getCheckoutStatus('checkout_query_fail');
      expect(result.status).toBe(CrayStatus.FAILED);
    });

    it('should not throw if requery network call fails; return cached PENDING state', async () => {
      await seedPendingCheckout('checkout_requery_network_fail');

      apiClient.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getCheckoutStatus('checkout_requery_network_fail');
      // Should still return a result (not throw) using last known state
      expect(result.status).toBeDefined();
    });

    it('should not call Cray if checkout is already in a terminal SUCCESSFUL state', async () => {
      await seedPendingCheckout('checkout_already_done');

      // First status call → marks SUCCESSFUL
      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: { status: 'Successful' },
      });
      await service.getCheckoutStatus('checkout_already_done');

      // Second status call → should NOT call apiClient.get again
      await service.getCheckoutStatus('checkout_already_done');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should throw NOT_FOUND for unknown reference', async () => {
      await expect(service.getCheckoutStatus('nonexistent_ref')).rejects.toThrow(CrayException);

      const thrownError = await service.getCheckoutStatus('nonexistent_ref').catch((e) => e);
      expect(thrownError.code).toBe(CrayErrorCode.NOT_FOUND);
    });
  });

  // =====================================================================
  // queryTransaction
  // =====================================================================

  describe('queryTransaction', () => {
    it('should query transaction via GET /api/query/{reference}', async () => {
      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: {
          status: 'Successful',
          reference: 'txn_ref_123',
          amount: 5000,
        },
      });

      const result = await service.queryTransaction('txn_ref_123');
      expect(apiClient.get).toHaveBeenCalledWith('/api/query/txn_ref_123');
      expect(result).toEqual(
        expect.objectContaining({
          status: 'Successful',
          reference: 'txn_ref_123',
          amount: 5000,
        }),
      );
    });

    it('should throw INVALID_INPUT if reference is empty', async () => {
      await expect(service.queryTransaction('')).rejects.toThrow(CrayException);
    });
  });

  // =====================================================================
  // chargeCard
  // =====================================================================

  describe('chargeCard', () => {
    it('should charge card via POST /api/v2/charge with transaction_id', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: true,
        data: {
          status: 'redirect_auth',
          reference: 'auth_ref_999',
        },
      });

      const result = await service.chargeCard('TXN_GATE_123');
      expect(apiClient.post).toHaveBeenCalledWith('/api/v2/charge', {
        transaction_id: 'TXN_GATE_123',
      });
      expect(result).toEqual(
        expect.objectContaining({
          status: 'redirect_auth',
          reference: 'auth_ref_999',
        }),
      );
    });

    it('should throw INVALID_INPUT if transaction_id is missing or whitespace', async () => {
      await expect(service.chargeCard('')).rejects.toThrow(CrayException);
      await expect(service.chargeCard('   ')).rejects.toThrow(CrayException);
    });
  });
});
