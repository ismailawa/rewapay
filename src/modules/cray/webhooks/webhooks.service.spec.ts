import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import { WebhooksVerifier } from './webhooks.verifier';
import { CrayApiClient } from '../clients/cray-api.client';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import { TEST_CRAY_OPTIONS } from '../testing/test-options';
import { CrayException } from '../interfaces/cray.interfaces';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let api: jest.Mocked<CrayApiClient>;
  let emitter: jest.Mocked<EventEmitter2>;
  const secret = 'rotating_webhook_key_5678';
  const hash = (data: Record<string, unknown>) => crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('base64');

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [
      WebhooksService, WebhooksVerifier,
      { provide: CrayApiClient, useValue: { get: jest.fn() } },
      { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      { provide: CRAY_MODULE_OPTIONS, useValue: { ...TEST_CRAY_OPTIONS, webhookKeys: ['old_key_1111', secret] } },
    ] }).compile();
    service = module.get(WebhooksService);
    api = module.get(CrayApiClient);
    emitter = module.get(EventEmitter2);
  });

  it('selects a rotating key by hint and emits only terminal collection success', async () => {
    const data = { customer_reference: 'pay_1', amount: '100.00', currency: 'GHS', status: 'Successful', account_number: '0123456789' };
    const result = await service.processWebhook({ event: 'collection.mobile_money.successful', data, hash: hash(data) }, { keyHint: '5678' });
    expect(result.status).toBe('PROCESSED');
    expect(emitter.emit).toHaveBeenCalledWith('funding.confirmed', expect.objectContaining({ reference: 'pay_1', currency: 'GHS' }));
  });

  it('does not emit a failure for pending collection events', async () => {
    const data = { customer_reference: 'pay_2', amount: '100.00', status: 'Processing' };
    await service.processWebhook({ event: 'collection.mobile_money.processing', data, hash: hash(data) }, { keyHint: '5678' });
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('requires HMAC on payout events and uses provider reference for authoritative requery', async () => {
    const data = { customer_reference: 'merchant_1', reference: 'CRAY_TX_1', amount: '500.00', status: 'Successful' };
    api.get.mockResolvedValue({ data: { status: 'approved' } });
    await service.processWebhook({ event: 'payout', data, hash: hash(data) }, { keyHint: '5678' });
    expect(api.get).toHaveBeenCalledWith('/payout/requery/CRAY_TX_1');
    expect(emitter.emit).toHaveBeenCalledWith('transfer.completed', expect.objectContaining({ reference: 'merchant_1', transferId: 'CRAY_TX_1' }));
  });

  it('deduplicates exact deliveries while allowing later state transitions', async () => {
    const pending = { customer_reference: 'pay_3', amount: '10.00', status: 'Processing' };
    const success = { ...pending, status: 'Successful' };
    expect((await service.processWebhook({ event: 'collection.mobile_money', data: pending, hash: hash(pending) }, { keyHint: '5678' })).status).toBe('PROCESSED');
    expect((await service.processWebhook({ event: 'collection.mobile_money', data: pending, hash: hash(pending) }, { keyHint: '5678' })).status).toBe('DUPLICATE');
    await service.processWebhook({ event: 'collection.mobile_money', data: success, hash: hash(success) }, { keyHint: '5678' });
    expect(emitter.emit).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid signatures and missing key hints during rotation', async () => {
    const data = { reference: 'x' };
    await expect(service.processWebhook({ event: 'payout', data, hash: 'bad' })).rejects.toThrow(CrayException);
  });

  it('persists a redacted payload instead of raw sensitive values', async () => {
    const data = { customer_reference: 'pay_redacted', status: 'Processing', account_number: '0123456789', bvn: '12345678901' };
    await service.processWebhook({ event: 'collection.transfer.processing', data, hash: hash(data) }, { keyHint: '5678' });
    const records = Array.from((service as unknown as { memory: Map<string, { sanitizedPayload: unknown }> }).memory.values());
    expect(JSON.stringify(records[0].sanitizedPayload)).not.toContain('0123456789');
    expect(JSON.stringify(records[0].sanitizedPayload)).not.toContain('12345678901');
    expect(records[0].sanitizedPayload).toEqual(expect.objectContaining({
      data: expect.objectContaining({ account_number: '***6789', bvn: '***8901' }),
    }));
  });
});
