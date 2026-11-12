import type { CrayModuleOptions } from '../config/cray.config';

export const TEST_CRAY_OPTIONS: CrayModuleOptions = {
  environment: 'test',
  baseUrl: 'https://sandbox.crayfi.io',
  collectionApiKey: 'test_collection_key',
  disbursementApiKey: 'test_disbursement_key',
  requestSigningEnabled: true,
  signingPrivateKey: 'test_private_key',
  signingKeyId: '11111111-1111-4111-8111-111111111111',
  webhookKeys: ['test_webhook_key_1234'],
  dataEncryptionKey: 'test-data-encryption-key-at-least-32-bytes',
  httpTimeoutMs: 5000,
  maxRetries: 2,
  generalRpm: 60,
  collectionPayoutRpm: 30,
};
