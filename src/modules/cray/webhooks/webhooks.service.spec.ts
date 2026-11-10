import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import { WebhooksVerifier } from './webhooks.verifier';
import { CrayApiClient } from '../clients/cray-api.client';
import { crayConfig } from '../config/cray.config';
import { CrayErrorCode } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';
import { CrayWebhookPayloadDto } from './dto/webhook-payload.dto';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let verifier: WebhooksVerifier;
  let apiClient: jest.Mocked<CrayApiClient>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const secret = 'test_webhook_secret_key_5678';
  const allowedIps = ['192.168.1.50', '127.0.0.1'];

  function computeValidHash(data: Record<string, unknown>, key: string): string {
    const serialized = JSON.stringify(data);
    return crypto.createHmac('sha256', key).update(serialized).digest('base64');
  }

  beforeEach(async () => {
    const mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockConfig = {
      webhookSecret: secret,
      webhookAllowedIps: allowedIps,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        WebhooksVerifier,
        { provide: CrayApiClient, useValue: mockApiClient },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: crayConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    verifier = module.get<WebhooksVerifier>(WebhooksVerifier);
    apiClient = module.get(CrayApiClient);
    eventEmitter = module.get(EventEmitter2);
  });

  // =====================================================================
  // Input Validation
  // =====================================================================

  describe('input validation', () => {
    it('should throw INVALID_INPUT if event or data is missing', async () => {
      await expect(
        service.processWebhook({} as CrayWebhookPayloadDto),
      ).rejects.toThrow(CrayException);
    });
  });

  // =====================================================================
  // Collection Events (HMAC Verification)
  // =====================================================================

  describe('collection webhooks', () => {
    const successData = {
      customer_reference: 'cust_ref_001',
      transaction_reference: 'TNW4UKB1XQZSVP86E7AR',
      amount: '5000.00',
      status: 'Successful',
      sender: {
        sender_name: '08012345678',
        sender_account_number: '08012345678',
      },
    };

    it('should verify HMAC and emit funding.confirmed for successful collection', async () => {
      const hash = computeValidHash(successData, secret);
      const payload: CrayWebhookPayloadDto = {
        event: 'collection.mobile_money.successful',
        data: successData,
        hash,
      };

      const result = await service.processWebhook(payload, { keyHint: '5678' });

      expect(result.received).toBe(true);
      expect(result.status).toBe('PROCESSED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'funding.confirmed',
        expect.objectContaining({
          reference: 'cust_ref_001',
          amount: '5000.00',
          currency: 'NGN',
        }),
      );
    });

    it('should verify HMAC and emit funding.failed for failed collection', async () => {
      const failedData = {
        customer_reference: 'cust_ref_002',
        amount: '2500.00',
        status: 'Failed',
        provider_message: 'FAIL_INSUFFICIENT_FUNDS',
      };
      const hash = computeValidHash(failedData, secret);
      const payload: CrayWebhookPayloadDto = {
        event: 'collection.mobile_money.failed',
        data: failedData,
        hash,
      };

      const result = await service.processWebhook(payload);

      expect(result.received).toBe(true);
      expect(result.status).toBe('PROCESSED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'funding.failed',
        expect.objectContaining({
          reference: 'cust_ref_002',
          reason: 'FAIL_INSUFFICIENT_FUNDS',
        }),
      );
    });

    it('should throw AUTHENTICATION_ERROR if HMAC signature is invalid', async () => {
      const payload: CrayWebhookPayloadDto = {
        event: 'collection.mobile_money.successful',
        data: successData,
        hash: 'invalid_base64_hash_here',
      };

      await expect(service.processWebhook(payload)).rejects.toThrow(CrayException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // Payout Webhooks (IP Allowlist + Authoritative Requery)
  // =====================================================================

  describe('payout webhooks', () => {
    const payoutData = {
      reference: 'PAYOUT_TXN_001',
      amount: '1600.00',
      status: 'Successful',
      recipient: {
        recipient_name: 'John Doe',
        recipient_account_number: '0123456789',
        recipient_bank_code: '058',
      },
    };

    it('should verify via authoritative requery and emit transfer.completed', async () => {
      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: {
          status: 'Successful',
          reference: 'PAYOUT_TXN_001',
        },
      });

      const payload: CrayWebhookPayloadDto = {
        event: 'payout',
        data: payoutData,
        key: 'pk_live_key',
      };

      const result = await service.processWebhook(payload, {
        clientIp: '192.168.1.50',
      });

      expect(result.received).toBe(true);
      expect(result.status).toBe('PROCESSED');
      expect(apiClient.get).toHaveBeenCalledWith('/payout/requery/PAYOUT_TXN_001');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'transfer.completed',
        expect.objectContaining({
          reference: 'PAYOUT_TXN_001',
          amount: '1600.00',
          currency: 'NGN',
        }),
      );
    });

    it('should reject payout webhook from unlisted IP', async () => {
      const payload: CrayWebhookPayloadDto = {
        event: 'payout',
        data: payoutData,
      };

      await expect(
        service.processWebhook(payload, { clientIp: '198.51.100.1' }),
      ).rejects.toThrow(CrayException);

      expect(apiClient.get).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not emit transfer.completed if authoritative requery does not match', async () => {
      apiClient.get.mockResolvedValueOnce({
        status: true,
        data: {
          status: 'pending', // Requery says still pending!
        },
      });

      const payload: CrayWebhookPayloadDto = {
        event: 'payout',
        data: payoutData,
      };

      const result = await service.processWebhook(payload, {
        clientIp: '127.0.0.1',
      });

      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(result.status).toBe('PROCESSED');
    });
  });

  // =====================================================================
  // Replay Defense / Idempotency
  // =====================================================================

  describe('replay defense & idempotency', () => {
    it('should acknowledge duplicate delivery without re-emitting domain event', async () => {
      const data = {
        customer_reference: 'idempotent_ref_999',
        amount: '1000.00',
        status: 'Successful',
      };
      const hash = computeValidHash(data, secret);
      const payload: CrayWebhookPayloadDto = {
        event: 'collection.mobile_money.successful',
        data,
        hash,
      };

      // First delivery
      const first = await service.processWebhook(payload);
      expect(first.status).toBe('PROCESSED');
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);

      // Replay / duplicate delivery with identical reference & event
      const second = await service.processWebhook(payload);
      expect(second.status).toBe('PROCESSED');
      // Should NOT have called eventEmitter.emit a second time
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================================================
  // Unhandled Event
  // =====================================================================

  describe('unhandled events', () => {
    it('should mark unknown event types as IGNORED', async () => {
      const payload: CrayWebhookPayloadDto = {
        event: 'customer.kyc.approved',
        data: { customer_id: 'cust_123' },
      };

      const result = await service.processWebhook(payload);
      expect(result.received).toBe(true);
      expect(result.status).toBe('IGNORED');
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});

