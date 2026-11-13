import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrayService } from './cray.service';
import { AccountsService } from './accounts/accounts.service';
import { BanksService } from './banks/banks.service';
import { TransfersService } from './transfers/transfers.service';
import { CheckoutService } from './checkout/checkout.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { IdempotencyService } from './idempotency/idempotency.service';
import { RefundsService } from './refunds/refunds.service';
import { WebhooksService } from './webhooks/webhooks.service';
import { WebhooksVerifier } from './webhooks/webhooks.verifier';
import { CrayApiClient } from './clients/cray-api.client';
import { CRAY_MODULE_OPTIONS } from './config/cray.constants';
import { TEST_CRAY_OPTIONS } from './testing/test-options';
import { CrayStatus } from './enums/cray.enums';

describe('Cray v1 in-process acceptance', () => {
  let facade: CrayService;
  let webhooks: WebhooksService;
  let api: jest.Mocked<CrayApiClient>;
  let emitter: EventEmitter2;
  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [
      CrayService, AccountsService, BanksService, TransfersService, CheckoutService,
      ReconciliationService, IdempotencyService, RefundsService, WebhooksService, WebhooksVerifier,
      EventEmitter2,
      { provide: CRAY_MODULE_OPTIONS, useValue: TEST_CRAY_OPTIONS },
      { provide: CrayApiClient, useValue: { get: jest.fn(), post: jest.fn() } },
    ] }).compile();
    facade = module.get(CrayService);
    webhooks = module.get(WebhooksService);
    api = module.get(CrayApiClient);
    emitter = module.get(EventEmitter2);
  });

  it('provisions a Bloc account and hosted transfer checkout', async () => {
    api.post
      .mockResolvedValueOnce({ success: true, data: { account_number: '0123456789', account_name: 'ACME-Jane', bank: 'Bloc MFB', sort_code: '51411' } })
      .mockResolvedValueOnce({ status: true, data: { link: 'https://checkout.example/PAY1', payCode: 'PAY1' } });

    const account = await facade.createVirtualAccount({ customerId: 'c1', provider: 'Bloc', accountType: 'Permanent', accountName: 'Jane', email: 'jane@example.com' });
    const checkout = await facade.createFundingSession({ customerId: 'c1', walletId: 'w1', amount: '100.00', reference: 'fund1', method: 'transfer', customer: { name: 'Jane Doe', email: 'jane@example.com' } });
    expect(account.accountNumber).toBe('0123456789');
    expect(checkout.paymentUrl).toBe('https://checkout.example/PAY1');
  });

  it('validates immediately before payout and completes from a signed webhook', async () => {
    api.post
      .mockResolvedValueOnce({ success: true, data: { account_name: 'Jane Doe', ref_id: 'sess_fresh' } })
      .mockResolvedValueOnce({ success: true, data: { reference: 'CRAY_PAYOUT_1', status: 'pending' } });
    const initiated = await facade.initiateTransfer({ walletId: 'w1', amount: '50.00', reference: 'merchant_payout_1', destination: { accountNumber: '0123456789', bankCode: '000013', accountName: 'Jane Doe' } });
    expect(initiated).toEqual({ transferId: 'CRAY_PAYOUT_1', status: CrayStatus.PENDING });
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/payout/accounts/validate', { account_number: '0123456789', bank_code: '000013' });

    api.get.mockResolvedValueOnce({ data: { status: 'approved' } });
    const listener = jest.fn();
    emitter.on('transfer.completed', listener);
    const data = { customer_reference: 'merchant_payout_1', reference: 'CRAY_PAYOUT_1', amount: '50.00', currency: 'NGN', status: 'Successful' };
    await webhooks.processWebhook({ event: 'payout', data });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ reference: 'merchant_payout_1', transferId: 'CRAY_PAYOUT_1' }));
  });

  it('initiates a partial refund and queries its terminal status', async () => {
    api.post.mockResolvedValueOnce({ data: { reference: 'REFUND_1', status: 'pending', amount: '5.00' } });
    api.get.mockResolvedValueOnce({ data: { reference: 'REFUND_1', status: 'completed', amount: '5.00' } });
    expect((await facade.initiateRefund({ reference: 'PAYMENT_1', amount: '5.00' })).refundId).toBe('REFUND_1');
    expect((await facade.getRefundStatus('REFUND_1')).status).toBe(CrayStatus.SUCCESSFUL);
  });

  it('initiates a full refund without inventing an amount', async () => {
    api.post.mockResolvedValueOnce({ data: { reference: 'REFUND_FULL_1', status: 'pending' } });
    await expect(facade.initiateRefund({ reference: 'PAYMENT_FULL_1' })).resolves.toEqual({
      refundId: 'REFUND_FULL_1',
      status: CrayStatus.PENDING,
    });
    expect(api.post).toHaveBeenCalledWith('/api/v2/refund/initiate', { reference: 'PAYMENT_FULL_1' });
  });
});
