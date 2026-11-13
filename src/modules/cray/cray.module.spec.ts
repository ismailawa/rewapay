import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CrayModule } from './cray.module';
import { CRAY_MODULE_OPTIONS, CRAY_SERVICE } from './config/cray.constants';
import { CrayService } from './cray.service';
import { CrayApiClient } from './clients/cray-api.client';
import { TEST_CRAY_OPTIONS } from './testing/test-options';
import {
  CrayCustomer, CrayVirtualAccount, CrayBeneficiary, CrayTransfer, CrayCheckout,
  CrayWebhookEvent, CrayIdempotencyRecord, CrayTransactionRecord, CrayBalanceSnapshot,
  CrayReconciliationRecord, CrayRefund,
} from './entities';

describe('CrayModule', () => {
  const entities = [CrayCustomer, CrayVirtualAccount, CrayBeneficiary, CrayTransfer, CrayCheckout, CrayWebhookEvent, CrayIdempotencyRecord, CrayTransactionRecord, CrayBalanceSnapshot, CrayReconciliationRecord, CrayRefund];
  const repo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), save: jest.fn(async (value) => value), create: jest.fn((value) => value), insert: jest.fn() };

  async function compile(builder: TestingModuleBuilder) {
    builder.overrideProvider(CrayApiClient).useValue({ get: jest.fn(), post: jest.fn() });
    for (const entity of entities) builder.overrideProvider(getRepositoryToken(entity)).useValue(repo);
    return builder.compile();
  }

  it('registers the secured v1 configuration and facade', async () => {
    const module = await compile(Test.createTestingModule({ imports: [CrayModule.forRoot(TEST_CRAY_OPTIONS)] }));
    expect(module.get(CRAY_SERVICE)).toBeInstanceOf(CrayService);
    expect(module.get(CRAY_MODULE_OPTIONS)).toEqual(expect.objectContaining({
      apiKey: 'test_api_key',
      requestSigningEnabled: true,
      dataEncryptionKey: TEST_CRAY_OPTIONS.dataEncryptionKey,
    }));
  });

  it('supports async secured configuration', async () => {
    const module = await compile(Test.createTestingModule({ imports: [CrayModule.forRootAsync({ useFactory: () => TEST_CRAY_OPTIONS })] }));
    expect(module.get(CRAY_MODULE_OPTIONS).signingKeyId).toBe(TEST_CRAY_OPTIONS.signingKeyId);
  });
});
