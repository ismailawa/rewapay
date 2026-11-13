import type { CrayModuleOptions } from '../config/cray.config';

export const TEST_CRAY_OPTIONS: CrayModuleOptions = {
  environment: 'test',
  baseUrl: 'https://dev-gateman.v3.connectramp.com',
  apiKey: 'test_api_key',
  requestSigningEnabled: true,
  signingPrivateKey: 'test_private_key',
  signingKeyId: '11111111-1111-4111-8111-111111111111',
  dataEncryptionKey: 'test-data-encryption-key-at-least-32-bytes',
  httpTimeoutMs: 5000,
  maxRetries: 2,
  generalRpm: 60,
  collectionPayoutRpm: 30,
};
