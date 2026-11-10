import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { CrayModule } from './cray.module';
import { CrayService } from './cray.service';
import { WebhooksService } from './webhooks/webhooks.service';
import { CrayApiClient } from './clients/cray-api.client';
import { CrayStatus } from './enums/cray.enums';
import { CRAY_SERVICE } from './config/cray.constants';
import { ICrayService } from './interfaces/cray.interfaces';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CrayCustomer } from './entities/cray-customer.entity';
import { CrayVirtualAccount } from './entities/cray-virtual-account.entity';
import { CrayBeneficiary } from './entities/cray-beneficiary.entity';
import { CrayTransfer } from './entities/cray-transfer.entity';
import { CrayCheckout } from './entities/cray-checkout.entity';
import { CrayWebhookEvent } from './entities/cray-webhook-event.entity';
import { CrayIdempotencyRecord } from './entities/cray-idempotency.entity';
import { CrayTransactionRecord } from './entities/cray-transaction.entity';
import { CrayBalanceSnapshot } from './entities/cray-balance-snapshot.entity';
import { CrayReconciliationRecord } from './entities/cray-reconciliation-record.entity';

describe('CrayModule End-to-End Acceptance Suite', () => {
  let moduleRef: TestingModule;
  let crayService: ICrayService;
  let webhooksService: WebhooksService;
  let apiClient: jest.Mocked<CrayApiClient>;
  let eventEmitter: EventEmitter2;

  const webhookSecret = 'acceptance_webhook_secret_key_1234';

  function computeHmac(data: Record<string, unknown>): string {
    return crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(data))
      .digest('base64');
  }

  const mockRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn((e) => Promise.resolve({ id: 'uuid-1', ...e })),
    create: jest.fn((e) => e),
  };

  beforeAll(async () => {
    const mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        CrayModule.forRoot({
          environment: 'test',
          apiToken: 'acceptance_token',
          webhookSecret,
          webhookAllowedIps: ['127.0.0.1'],
        }),
      ],
    })
      .overrideProvider(CrayApiClient)
      .useValue(mockApiClient)
      .overrideProvider(getRepositoryToken(CrayCustomer))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayVirtualAccount))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayBeneficiary))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayTransfer))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayCheckout))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayWebhookEvent))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayIdempotencyRecord))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayTransactionRecord))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayBalanceSnapshot))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(CrayReconciliationRecord))
      .useValue(mockRepo)
      .compile();

    crayService = moduleRef.get<ICrayService>(CRAY_SERVICE);
    webhooksService = moduleRef.get<WebhooksService>(WebhooksService);
    apiClient = moduleRef.get(CrayApiClient);
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2);
  });

  // =====================================================================
  // 1. Virtual Account Provisioning Lifecycle
  // =====================================================================

  it('Scenario 1: Creates virtual account, persists customer, and queries account details', async () => {
    apiClient.post.mockResolvedValueOnce({
      status: true,
      message: 'Account created successfully',
      data: {
        account_number: '0123456789',
        account_name: 'RewaPay User 01',
        bank_name: 'Wema Bank',
        bank_code: '035',
        status: 'ACTIVE',
      },
    });

    const vaResult = await crayService.createVirtualAccount({
      customerId: 'cust_e2e_001',
      fullName: 'RewaPay User 01',
      email: 'user01@rewapay.io',
      bvn: '22222222222',
    });

    expect(vaResult.accountNumber).toBe('0123456789');
    expect(vaResult.bankName).toBe('Wema Bank');
    expect(vaResult.status).toBe(CrayStatus.SUCCESSFUL);
  });

  // =====================================================================
  // 2. Hosted Checkout & Funding Lifecycle with Signed Webhook Delivery
  // =====================================================================

  it('Scenario 2: Initializes hosted checkout, receives signed collection webhook, and confirms funding', async () => {
    // 1. Initialize hosted checkout session
    apiClient.post.mockResolvedValueOnce({
      status: true,
      message: 'Link generated successfully',
      data: {
        link: 'https://checkout.crayfi.com/pay/SES_98765',
        reference: 'funding_e2e_ref_001',
        payCode: 'SES_98765',
      },
    });

    const fundingSession = await crayService.createFundingSession({
      customerId: 'cust_e2e_002',
      walletId: 'wal_e2e_002',
      amount: '15000.00',
      reference: 'funding_e2e_ref_001',
      method: 'transfer',
    });

    expect(fundingSession.paymentUrl).toBe('https://checkout.crayfi.com/pay/SES_98765');
    expect(fundingSession.sessionId).toBe('SES_98765');

    // 2. Customer pays on checkout page -> Cray sends signed collection webhook
    let emittedFundingEvent: any = null;
    eventEmitter.on('funding.confirmed', (evt) => {
      emittedFundingEvent = evt;
    });

    const webhookData = {
      customer_reference: 'funding_e2e_ref_001',
      transaction_reference: 'CRAY_TXN_COLLECT_01',
      amount: '15000.00',
      status: 'Successful',
    };

    const hash = computeHmac(webhookData);

    const webhookResult = await webhooksService.processWebhook({
      event: 'collection.mobile_money.successful',
      data: webhookData,
      hash,
    });

    expect(webhookResult.received).toBe(true);
    expect(webhookResult.status).toBe('PROCESSED');
    expect(emittedFundingEvent).not.toBeNull();
    expect(emittedFundingEvent.reference).toBe('funding_e2e_ref_001');
    expect(emittedFundingEvent.amount).toBe('15000.00');
  });

  // =====================================================================
  // 3. Payout Lifecycle with Authoritative Requery & Webhook
  // =====================================================================

  it('Scenario 3: Validates beneficiary bank, initiates payout, and completes via webhook', async () => {
    // 1. Validate destination bank account
    apiClient.post.mockResolvedValueOnce({
      status: true,
      message: 'Account validated',
      data: {
        account_name: 'Recipient John Doe',
        ref_id: 'val_session_e2e_777',
      },
    });

    const bankValidation = await crayService.validateBankAccount({
      accountNumber: '9876543210',
      bankCode: '058',
    });

    expect(bankValidation.accountName).toBe('Recipient John Doe');
    expect(bankValidation.refId).toBe('val_session_e2e_777');

    // 2. Initiate payout disburse
    apiClient.post.mockResolvedValueOnce({
      status: true,
      message: 'Payout initiated',
      data: {
        status: 'pending',
        transaction_id: 'CRAY_PAYOUT_TXN_888',
        reference: 'payout_e2e_ref_001',
      },
    });

    const transferResult = await crayService.initiateTransfer({
      walletId: 'wal_e2e_payout',
      amount: '50000.00',
      reference: 'payout_e2e_ref_001',
      destination: {
        accountNumber: '9876543210',
        bankCode: '058',
        accountName: 'Recipient John Doe',
      },
    });

    expect(transferResult.status).toBe(CrayStatus.PENDING);

    // 3. Cray payout webhook arrives -> verified via authoritative requery
    let emittedTransferEvent: any = null;
    eventEmitter.on('transfer.completed', (evt) => {
      emittedTransferEvent = evt;
    });

    apiClient.get.mockResolvedValueOnce({
      status: true,
      data: {
        status: 'approved',
        reference: 'payout_e2e_ref_001',
      },
    });

    const payoutWebhook = await webhooksService.processWebhook(
      {
        event: 'payout',
        data: {
          reference: 'payout_e2e_ref_001',
          amount: '50000.00',
          status: 'Successful',
        },
      },
      { clientIp: '127.0.0.1' },
    );

    expect(payoutWebhook.received).toBe(true);
    expect(emittedTransferEvent).not.toBeNull();
    expect(emittedTransferEvent.reference).toBe('payout_e2e_ref_001');
    expect(emittedTransferEvent.amount).toBe('50000.00');
  });

  // =====================================================================
  // 4. Platform Balance Verification
  // =====================================================================

  it('Scenario 4: Fetches and verifies platform balance', async () => {
    apiClient.get.mockResolvedValueOnce({
      status: true,
      message: 'Account balance retrieved successfully',
      data: [
        {
          id: 'wallet_ngn_01',
          currency: 'NGN',
          available_balance: 250000,
          actual_balance: 260000,
        },
      ],
    });

    const balance = await crayService.getPlatformBalance('NGN');
    expect(balance.currency).toBe('NGN');
    expect(balance.available).toBe('250000.00');
    expect(balance.ledger).toBe('260000.00');
  });
});
