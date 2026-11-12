import { Test } from '@nestjs/testing';
import { CrayService } from './cray.service';
import { AccountsService } from './accounts/accounts.service';
import { BanksService } from './banks/banks.service';
import { TransfersService } from './transfers/transfers.service';
import { CheckoutService } from './checkout/checkout.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { IdempotencyService } from './idempotency/idempotency.service';
import { RefundsService } from './refunds/refunds.service';
import { CrayStatus } from './enums/cray.enums';
import { CrayException } from './interfaces/cray.interfaces';

describe('CrayService v2 facade', () => {
  let service: CrayService;
  const accounts = { createVirtualAccount: jest.fn(), getVirtualAccount: jest.fn() };
  const banks = { listBanks: jest.fn(), validateBankAccount: jest.fn() };
  const transfers = { initiateTransfer: jest.fn(), getTransferStatus: jest.fn() };
  const checkout = { createCheckoutSession: jest.fn(), getCheckoutStatus: jest.fn() };
  const reconciliation = { getPlatformBalance: jest.fn() };
  const refunds = { initiate: jest.fn(), getStatus: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [
      CrayService, IdempotencyService,
      { provide: AccountsService, useValue: accounts },
      { provide: BanksService, useValue: banks },
      { provide: TransfersService, useValue: transfers },
      { provide: CheckoutService, useValue: checkout },
      { provide: ReconciliationService, useValue: reconciliation },
      { provide: RefundsService, useValue: refunds },
    ] }).compile();
    service = module.get(CrayService);
  });

  it('forwards provider-specific virtual account input', async () => {
    accounts.createVirtualAccount.mockResolvedValue({ accountNumber: '1234567890', accountName: 'Jane', bankName: 'Bloc MFB', status: CrayStatus.SUCCESSFUL });
    const input = { customerId: 'c1', provider: 'Bloc' as const, accountType: 'Permanent' as const, accountName: 'Jane', email: 'jane@example.com' };
    expect((await service.createVirtualAccount(input)).accountNumber).toBe('1234567890');
    expect(accounts.createVirtualAccount).toHaveBeenCalledWith(input);
  });

  it('creates idempotent funding with real customer details and no synthesized PII', async () => {
    checkout.createCheckoutSession.mockResolvedValue({ sessionId: 'p1', paymentUrl: 'https://pay.example/p1' });
    const input = { customerId: 'c1', walletId: 'w1', amount: '100.00', reference: 'fund1', method: 'transfer' as const, customer: { name: 'Jane Doe', email: 'jane@example.com' }, callbackUrl: 'https://example.com/callback' };
    await service.createFundingSession(input);
    await service.createFundingSession(input);
    expect(checkout.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(checkout.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ customer: input.customer, callback_url: input.callbackUrl }));
  });

  it('rejects funding without customer details', async () => {
    await expect(service.createFundingSession({ customerId: 'c', walletId: 'w', amount: '1.00', reference: 'x', method: 'transfer' } as never)).rejects.toThrow(CrayException);
  });

  it('protects transfer initiation with operation-scoped idempotency', async () => {
    transfers.initiateTransfer.mockResolvedValue({ transferId: 't1', status: CrayStatus.PENDING });
    const input = { walletId: 'w', amount: '10.00', reference: 'same', destination: { accountNumber: '0123456789', bankCode: '000013', accountName: 'Jane' } };
    await service.initiateTransfer(input);
    await service.initiateTransfer(input);
    expect(transfers.initiateTransfer).toHaveBeenCalledTimes(1);
  });

  it('initiates and queries real refunds', async () => {
    refunds.initiate.mockResolvedValue({ refundId: 'r1', status: CrayStatus.PENDING });
    refunds.getStatus.mockResolvedValue({ refundId: 'r1', status: CrayStatus.SUCCESSFUL, amount: '5.00' });
    expect((await service.initiateRefund({ reference: 'original', amount: '5.00' })).refundId).toBe('r1');
    expect((await service.getRefundStatus('r1')).status).toBe(CrayStatus.SUCCESSFUL);
  });

  it('forwards query operations', async () => {
    checkout.getCheckoutStatus.mockResolvedValue({ status: CrayStatus.SUCCESSFUL, amount: '1.00' });
    transfers.getTransferStatus.mockResolvedValue({ status: CrayStatus.SUCCESSFUL, amount: '2.00' });
    reconciliation.getPlatformBalance.mockResolvedValue({ currency: 'NGN', available: '3.00' });
    expect((await service.getFundingStatus('f')).amount).toBe('1.00');
    expect((await service.getTransferStatus('t')).amount).toBe('2.00');
    expect((await service.getPlatformBalance()).available).toBe('3.00');
  });
});
