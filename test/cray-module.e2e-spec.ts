import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataType, newDb } from 'pg-mem';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { CrayModule } from '../src/modules/cray/cray.module';
import { CrayService } from '../src/modules/cray/cray.service';
import { CrayApiClient } from '../src/modules/cray/clients/cray-api.client';
import { CheckoutService } from '../src/modules/cray/checkout/checkout.service';
import { ReconciliationService } from '../src/modules/cray/reconciliation/reconciliation.service';
import { WebhooksService } from '../src/modules/cray/webhooks/webhooks.service';
import { CrayStatus } from '../src/modules/cray/enums/cray.enums';
import { TEST_CRAY_OPTIONS } from '../src/modules/cray/testing/test-options';
import { CrayBeneficiary } from '../src/modules/cray/entities/cray-beneficiary.entity';
import { CrayBalanceSnapshot } from '../src/modules/cray/entities/cray-balance-snapshot.entity';
import { CrayCheckout } from '../src/modules/cray/entities/cray-checkout.entity';
import { CrayReconciliationRecord } from '../src/modules/cray/entities/cray-reconciliation-record.entity';
import { CrayRefund } from '../src/modules/cray/entities/cray-refund.entity';
import { CrayTransfer } from '../src/modules/cray/entities/cray-transfer.entity';
import { CrayVirtualAccount } from '../src/modules/cray/entities/cray-virtual-account.entity';
import { CrayWebhookEvent } from '../src/modules/cray/entities/cray-webhook-event.entity';
import * as entities from '../src/modules/cray/entities';

const entityList = Object.values(entities).filter(
  (value) => typeof value === 'function',
);

async function createTestDataSource(): Promise<DataSource> {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'current_database',
    implementation: () => 'cray_module_e2e',
  });
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 16',
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    implementation: randomUUID,
    impure: true,
  });
  db.public.registerFunction({
    name: 'quote_ident',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value: string) => value,
  });
  db.public.registerFunction({
    name: 'obj_description',
    args: [DataType.regclass, DataType.text],
    returns: DataType.text,
    implementation: () => null,
  });
  db.public.registerFunction({
    name: 'col_description',
    args: [DataType.regclass, DataType.integer],
    returns: DataType.text,
    implementation: () => null,
  });

  // pg-mem exposes its TypeORM adapter as `any` even though it returns a DataSource.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const source: DataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: entityList,
    synchronize: true,
    retryAttempts: 1,
  });
  return source.initialize();
}

describe('CrayModule full database-backed e2e', () => {
  let moduleFixture: TestingModule;
  let source: DataSource;
  let cray: CrayService;
  let checkout: CheckoutService;
  let reconciliation: ReconciliationService;
  let webhooks: WebhooksService;
  let eventEmitter: EventEmitter2;
  let api: {
    get: jest.Mock<Promise<unknown>, [string, unknown?]>;
    post: jest.Mock<Promise<unknown>, [string, unknown?, unknown?]>;
  };

  beforeAll(async () => {
    source = await createTestDataSource();
    api = {
      get: jest.fn<Promise<unknown>, [string, unknown?]>(),
      post: jest.fn<Promise<unknown>, [string, unknown?, unknown?]>(),
    };

    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          retryAttempts: 1,
          useFactory: () => source.options,
          dataSourceFactory: () => Promise.resolve(source),
        }),
        CrayModule.forRoot(TEST_CRAY_OPTIONS),
      ],
    })
      .overrideProvider(CrayApiClient)
      .useValue(api)
      .compile();

    await moduleFixture.init();
    cray = moduleFixture.get(CrayService);
    checkout = moduleFixture.get(CheckoutService);
    reconciliation = moduleFixture.get(ReconciliationService);
    webhooks = moduleFixture.get(WebhooksService);
    eventEmitter = moduleFixture.get(EventEmitter2);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (moduleFixture) await moduleFixture.close();
  });

  it('creates Bloc, PalmPay, one-time, and corporate accounts with provider-specific contracts', async () => {
    let accountSequence = 0;
    api.post.mockImplementation((path, payload) => {
      accountSequence += 1;
      const request = payload as Record<string, unknown>;
      return Promise.resolve({
        data: {
          id: `provider-va-${accountSequence}`,
          account_number: `100000000${accountSequence}`,
          account_name:
            (request.account_name as string) || (request.full_name as string),
          bank:
            path === '/api/v2/corporate-accounts/create' ? 'Wema Bank' : 'Cray Bank',
          sort_code: '035',
        },
      });
    });

    const cases = [
      {
        input: {
          customerId: 'customer-bloc-permanent',
          email: 'bloc@example.com',
          accountName: 'Bloc Customer',
          provider: 'Bloc' as const,
          accountType: 'Permanent' as const,
          firstName: 'Bloc',
          lastName: 'Customer',
        },
        endpoint: '/api/virtual-accounts/create',
        payload: {
          provider: 'Bloc',
          virtual_account_type: 'Permanent',
          type: 'individual',
          first_name: 'Bloc',
          last_name: 'Customer',
        },
      },
      {
        input: {
          customerId: 'customer-palmpay-permanent',
          email: 'palmpay@example.com',
          accountName: 'PalmPay Customer',
          customerName: 'PalmPay Customer',
          provider: 'palmpay' as const,
          accountType: 'Permanent' as const,
          bvn: '12345678901',
        },
        endpoint: '/api/virtual-accounts/create',
        payload: {
          provider: 'palmpay',
          account_type: 'Permanent',
          customer_name: 'PalmPay Customer',
          bvn: '12345678901',
        },
      },
      {
        input: {
          customerId: 'customer-bloc-onetime',
          email: 'bloc-onetime@example.com',
          accountName: 'Bloc One Time',
          provider: 'Bloc' as const,
          accountType: 'onetime' as const,
          amount: '2500.00',
        },
        endpoint: '/api/virtual-accounts/create',
        payload: {
          provider: 'Bloc',
          account_type: 'onetime',
          amount: '2500.00',
        },
      },
      {
        input: {
          customerId: 'customer-palmpay-onetime',
          email: 'palmpay-onetime@example.com',
          accountName: 'PalmPay One Time',
          provider: 'palmpay' as const,
          accountType: 'onetime' as const,
          amount: '3200.00',
          returnUrl: 'https://merchant.example/return',
          orderExpireSeconds: 3600,
        },
        endpoint: '/api/virtual-accounts/create',
        payload: {
          provider: 'palmpay',
          account_type: 'onetime',
          amount: '3200.00',
          return_url: 'https://merchant.example/return',
          order_expire_seconds: 3600,
        },
      },
      {
        input: {
          customerId: 'customer-corporate',
          accountType: 'corporate' as const,
          fullName: 'Cray Trading Limited',
          bvn: '10987654321',
          rcNumber: 'RC123456',
          phone: '08012345678',
          email: 'company@example.com',
          businessType: 'COMPANY' as const,
          businessName: 'Cray Trading',
        },
        endpoint: '/api/v2/corporate-accounts/create',
        payload: {
          full_name: 'Cray Trading Limited',
          rc_number: 'RC123456',
          customer_email: 'company@example.com',
          business_type: 'COMPANY',
        },
      },
    ];

    for (const scenario of cases) {
      const result = await cray.createVirtualAccount(scenario.input);
      expect(typeof result.accountNumber).toBe('string');
      expect(result.status).toBe(CrayStatus.SUCCESSFUL);
      expect(api.post).toHaveBeenLastCalledWith(
        scenario.endpoint,
        expect.objectContaining(scenario.payload),
      );
    }

    const repo = moduleFixture.get<Repository<CrayVirtualAccount>>(
      getRepositoryToken(CrayVirtualAccount),
    );
    const records = await repo.find();
    expect(records).toHaveLength(5);
    expect(records[0].accountNumber).not.toContain('1000000001');
    expect(records[0].accountNumberLast4).toBe('0001');
    await expect(
      cray.getVirtualAccount('customer-bloc-permanent'),
    ).resolves.toEqual(
      expect.objectContaining({ accountNumber: '1000000001' }),
    );
  });

  it('normalizes the bank directory and persists validated beneficiaries without plaintext account numbers', async () => {
    api.get.mockResolvedValueOnce({
      data: [
        { bank_name: 'Access Bank', bank_code: '044' },
        { institutionName: 'Wema Bank', institutionCode: '035' },
      ],
    });
    await expect(cray.listBanks()).resolves.toEqual([
      { name: 'Access Bank', code: '044' },
      { name: 'Wema Bank', code: '035' },
    ]);

    api.post.mockResolvedValueOnce({
      data: { account_name: 'Ada Lovelace', ref_id: 'validation-ref-1' },
    });
    await expect(
      cray.validateBankAccount({
        accountNumber: '0123456789',
        bankCode: '044',
      }),
    ).resolves.toEqual({
      accountName: 'Ada Lovelace',
      refId: 'validation-ref-1',
    });
    expect(api.post).toHaveBeenCalledWith('/api/payout/accounts/validate', {
      account_number: '0123456789',
      bank_code: '044',
    });

    const repo = moduleFixture.get<Repository<CrayBeneficiary>>(
      getRepositoryToken(CrayBeneficiary),
    );
    const saved = await repo.findOneByOrFail({
      providerReference: 'validation-ref-1',
    });
    expect(saved.accountNumber).not.toContain('0123456789');
    expect(saved.accountNumberLast4).toBe('6789');
    expect(saved.accountNumberHash).toHaveLength(64);
  });

  it('runs card, transfer, and mobile-money hosted checkout lifecycles and persists terminal state', async () => {
    api.post.mockImplementation((path, payload) => {
      expect(path).toBe('/api/checkout/initialize');
      const reference = (payload as Record<string, unknown>)
        .reference as string;
      return Promise.resolve({
        data: {
          link: `https://checkout.cray.test/${reference}`,
          payCode: `PAY-${reference}`,
        },
      });
    });

    for (const method of ['card', 'transfer', 'mobile_money'] as const) {
      const reference = `funding-${method}`;
      const result = await cray.createFundingSession({
        customerId: `customer-${method}`,
        walletId: `wallet-${method}`,
        amount: '1000.00',
        reference,
        method,
        customer: { name: 'Grace Hopper', email: 'grace@example.com' },
        ...(method === 'card' ? { token: 'subaccount-token' } : {}),
        callbackUrl: 'https://merchant.example/callback',
        metadata: { channel: method },
      });
      expect(result).toEqual({
        sessionId: `PAY-${reference}`,
        paymentUrl: `https://checkout.cray.test/${reference}`,
        expiresAt: undefined,
      });
      expect(api.post).toHaveBeenLastCalledWith(
        '/api/checkout/initialize',
        expect.objectContaining({
          amount: '1000.00',
          reference,
          defaultPaymentMethod: method,
          customer: { name: 'Grace Hopper', email: 'grace@example.com' },
          callback_url: 'https://merchant.example/callback',
          metadata: { channel: method },
          ...(method === 'card' ? { token: 'subaccount-token' } : {}),
        }),
      );
    }

    api.get.mockImplementation((path) =>
      Promise.resolve({
        data: {
          status: 'successful',
          amount: '1000.00',
          provider_reference: `provider-${path}`,
          payment_channel: 'hosted_checkout',
          net_amount: '980.00',
          fee: '20.00',
        },
      }),
    );
    for (const method of ['card', 'transfer', 'mobile_money'] as const) {
      await expect(cray.getFundingStatus(`funding-${method}`)).resolves.toEqual(
        expect.objectContaining({
          status: CrayStatus.SUCCESSFUL,
          amount: 1000,
        }),
      );
      expect(api.get).toHaveBeenCalledWith(
        `/api/checkout/query/PAY-funding-${method}`,
      );
    }

    const repo = moduleFixture.get<Repository<CrayCheckout>>(
      getRepositoryToken(CrayCheckout),
    );
    expect(await repo.countBy({ status: CrayStatus.SUCCESSFUL })).toBe(3);
  });

  it('validates immediately before payout, stores the provider ID, and requeries only that ID', async () => {
    api.post
      .mockResolvedValueOnce({
        data: { account_name: 'Katherine Johnson', ref_id: 'fresh-ref-id' },
      })
      .mockResolvedValueOnce({
        data: {
          reference: 'cray-transfer-id',
          status: 'pending',
          charge: '25.00',
        },
      });

    await expect(
      cray.initiateTransfer({
        walletId: 'wallet-payout',
        amount: '5000.00',
        reference: 'merchant-transfer-reference',
        destination: {
          accountNumber: '1234567890',
          bankCode: '035',
          accountName: 'Katherine Johnson',
        },
      }),
    ).resolves.toEqual({
      transferId: 'cray-transfer-id',
      status: CrayStatus.PENDING,
    });

    expect(api.post.mock.calls).toEqual([
      [
        '/api/payout/accounts/validate',
        { account_number: '1234567890', bank_code: '035' },
      ],
      [
        '/api/payout/disburse',
        {
          customer_reference: 'merchant-transfer-reference',
          account_number: '1234567890',
          bank_code: '035',
          amount: '5000.00',
          narration: 'Payout',
          recipient_name: 'Katherine Johnson',
          ref_id: 'fresh-ref-id',
          currency: 'NGN',
        },
      ],
    ]);

    api.get.mockResolvedValueOnce({
      data: { status: 'approved', amount: '5000.00' },
    });
    await expect(
      cray.getTransferStatus('merchant-transfer-reference'),
    ).resolves.toEqual(
      expect.objectContaining({ status: CrayStatus.SUCCESSFUL, amount: 5000 }),
    );
    expect(api.get).toHaveBeenCalledWith('/api/payout/requery/cray-transfer-id');

    const repo = moduleFixture.get<Repository<CrayTransfer>>(
      getRepositoryToken(CrayTransfer),
    );
    const saved = await repo.findOneByOrFail({
      reference: 'merchant-transfer-reference',
    });
    expect(saved.providerTransferReference).toBe('cray-transfer-id');
    expect(saved.accountNumber).not.toContain('1234567890');
    expect(saved.accountNumberLast4).toBe('7890');
  });

  it('executes and persists full and partial refund lifecycles', async () => {
    api.post
      .mockResolvedValueOnce({
        data: { reference: 'refund-full-id', status: 'processing' },
      })
      .mockResolvedValueOnce({
        data: {
          reference: 'refund-partial-id',
          status: 'processing',
          amount: '250.00',
        },
      });

    await expect(
      cray.initiateRefund({ reference: 'payment-full' }),
    ).resolves.toEqual({
      refundId: 'refund-full-id',
      status: CrayStatus.PROCESSING,
    });
    await expect(
      cray.initiateRefund({ reference: 'payment-partial', amount: '250.00' }),
    ).resolves.toEqual({
      refundId: 'refund-partial-id',
      status: CrayStatus.PROCESSING,
    });
    expect(api.post.mock.calls).toEqual([
      ['/api/v2/refund/initiate', { reference: 'payment-full' }],
      ['/api/v2/refund/initiate', { reference: 'payment-partial', amount: '250.00' }],
    ]);

    api.get.mockResolvedValueOnce({
      data: {
        reference: 'refund-partial-id',
        status: 'completed',
        amount: 250,
      },
    });
    await expect(cray.getRefundStatus('payment-partial')).resolves.toEqual(
      expect.objectContaining({
        refundId: 'refund-partial-id',
        status: CrayStatus.SUCCESSFUL,
        amount: '250.00',
      }),
    );
    expect(api.get).toHaveBeenCalledWith('/api/v2/refund/query/payment-partial');

    const repo = moduleFixture.get<Repository<CrayRefund>>(
      getRepositoryToken(CrayRefund),
    );
    await expect(
      repo.findOneByOrFail({ reference: 'payment-partial' }),
    ).resolves.toEqual(
      expect.objectContaining({
        providerReference: 'refund-partial-id',
        status: CrayStatus.SUCCESSFUL,
        amount: 250,
      }),
    );
  });

  it('queries direct collection helpers and records balance snapshots and reconciliation outcomes', async () => {
    api.get.mockResolvedValueOnce({
      data: { reference: 'collection-1', status: 'successful' },
    });
    await expect(checkout.queryTransaction('collection-1')).resolves.toEqual({
      reference: 'collection-1',
      status: 'successful',
    });
    expect(api.get).toHaveBeenLastCalledWith('/api/query/collection-1');

    api.post.mockResolvedValueOnce({
      data: { transaction_id: 'card-transaction-1', status: 'pending' },
    });
    await expect(checkout.chargeCard('card-transaction-1')).resolves.toEqual({
      transaction_id: 'card-transaction-1',
      status: 'pending',
    });
    expect(api.post).toHaveBeenCalledWith('/api/v2/charge', {
      transaction_id: 'card-transaction-1',
    });

    const balanceResponse = {
      data: {
        id: 'wallet-ngn',
        currency: 'NGN',
        available_balance: 150000,
        actual_balance: '155000.00',
        locked_balance: 5000,
      },
    };
    api.get
      .mockResolvedValueOnce(balanceResponse)
      .mockResolvedValueOnce(balanceResponse);
    await expect(cray.getPlatformBalance()).resolves.toEqual({
      currency: 'NGN',
      available: '150000.00',
      ledger: '155000.00',
    });
    await reconciliation.snapshotPlatformBalance();
    const snapshotRepo = moduleFixture.get<Repository<CrayBalanceSnapshot>>(
      getRepositoryToken(CrayBalanceSnapshot),
    );
    await expect(
      snapshotRepo.findOneByOrFail({ providerAccountId: 'wallet-ngn' }),
    ).resolves.toEqual(
      expect.objectContaining({
        availableBalance: 150000,
        lockedBalance: 5000,
      }),
    );

    const checkoutRepo = moduleFixture.get<Repository<CrayCheckout>>(
      getRepositoryToken(CrayCheckout),
    );
    await checkoutRepo.save(
      checkoutRepo.create({
        reference: 'reconcile-checkout',
        payCode: 'RECON-PAY-CODE',
        amount: '90.00',
        currency: 'NGN',
        status: CrayStatus.PENDING,
      }),
    );
    api.get.mockResolvedValueOnce({ data: { status: 'successful' } });
    const report = await reconciliation.reconcilePendingTransactions(
      -1,
      1000000,
    );
    expect(report).toEqual(
      expect.objectContaining({
        totalProcessed: 1,
        resolvedCount: 1,
        stuckCount: 0,
      }),
    );
    expect(api.get).toHaveBeenLastCalledWith('/api/checkout/query/RECON-PAY-CODE');
    const reconRepo = moduleFixture.get<Repository<CrayReconciliationRecord>>(
      getRepositoryToken(CrayReconciliationRecord),
    );
    await expect(
      reconRepo.findOneByOrFail({ reference: 'reconcile-checkout' }),
    ).resolves.toEqual(
      expect.objectContaining({
        resolved: true,
        newStatus: CrayStatus.SUCCESSFUL,
      }),
    );
  });

  it('authoritatively verifies unsigned v1 payins, permits state transitions, emits only terminal events, redacts, and deduplicates', async () => {
    const emitted: unknown[] = [];
    eventEmitter.on('funding.confirmed', (event) => emitted.push(event));

    const pendingData = {
      event_id: 'event-pending',
      reference: 'provider-pay-in-1',
      customer_reference: 'merchant-pay-in-1',
      status: 'pending',
      amount: '700.00',
      currency: 'NGN',
      account_number: '0123456789',
    };
    api.get.mockResolvedValueOnce({ data: { status: 'pending' } });
    await expect(
      webhooks.processWebhook({ event: 'payin', data: pendingData }),
    ).resolves.toEqual({
      received: true,
      eventId: 'event-pending',
      status: 'PROCESSED',
    });
    expect(emitted).toHaveLength(0);

    const successfulData = {
      ...pendingData,
      event_id: 'event-successful',
      status: 'successful',
      customer_id: 'customer-webhook',
      wallet_id: 'wallet-webhook',
    };
    const successfulPayload = {
      event: 'payin',
      data: successfulData,
    };
    api.get.mockResolvedValueOnce({ data: { status: 'successful' } });
    await expect(
      webhooks.processWebhook(successfulPayload),
    ).resolves.toEqual({
      received: true,
      eventId: 'event-successful',
      status: 'PROCESSED',
    });
    expect(api.get).toHaveBeenLastCalledWith('/api/query/provider-pay-in-1');
    expect(emitted).toEqual([
      expect.objectContaining({
        eventId: 'event-successful',
        reference: 'merchant-pay-in-1',
        amount: '700.00',
        currency: 'NGN',
      }),
    ]);

    await expect(
      webhooks.processWebhook(successfulPayload),
    ).resolves.toEqual({
      received: true,
      eventId: 'event-successful',
      status: 'DUPLICATE',
    });
    expect(emitted).toHaveLength(1);

    const repo = moduleFixture.get<Repository<CrayWebhookEvent>>(
      getRepositoryToken(CrayWebhookEvent),
    );
    const records = await repo.find({ order: { receivedAt: 'ASC' } });
    expect(records).toHaveLength(2);
    expect(JSON.stringify(records[1].sanitizedPayload)).not.toContain(
      '0123456789',
    );
    expect(JSON.stringify(records[1].sanitizedPayload)).toContain('***6789');
  });
});
