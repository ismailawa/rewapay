import 'dotenv/config';
import { CrayApiClient } from '../src/modules/cray/clients/cray-api.client';
import { CrayModuleOptions } from '../src/modules/cray/config/cray.config';
import {
  CRAY_DEFAULT_COLLECTION_PAYOUT_RPM,
  CRAY_DEFAULT_GENERAL_RPM,
  CRAY_DEFAULT_HTTP_TIMEOUT_MS,
  CRAY_DEFAULT_STAGING_BASE_URL,
} from '../src/modules/cray/config/cray.constants';

interface CrayEnvelope {
  status?: boolean | string;
  message?: string;
  data?: unknown;
}

const liveEnabled = process.env.RUN_CRAY_LIVE_E2E === 'true';
const describeLive = liveEnabled ? describe : describe.skip;

function requiredEnvironment(
  environment: NodeJS.ProcessEnv,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (!value || /replace_with/i.test(value)) {
    throw new Error(`${name} must contain a real value.`);
  }
  return value;
}

export function buildLiveOptions(
  environment: NodeJS.ProcessEnv = process.env,
): CrayModuleOptions {
  const crayEnvironment = environment.CRAY_ENVIRONMENT?.trim() || 'staging';
  if (crayEnvironment !== 'staging') {
    throw new Error('Live E2E only supports CRAY_ENVIRONMENT=staging.');
  }

  const baseUrl = (
    environment.CRAY_BASE_URL?.trim() || CRAY_DEFAULT_STAGING_BASE_URL
  ).replace(/\/$/, '');
  if (baseUrl !== CRAY_DEFAULT_STAGING_BASE_URL) {
    throw new Error(
      `Live E2E only supports the Cray v1 staging gateway: ${CRAY_DEFAULT_STAGING_BASE_URL}.`,
    );
  }

  const requestSigningEnabled =
    environment.CRAY_REQUEST_SIGNING_ENABLED?.toLowerCase() === 'true';

  return {
    environment: crayEnvironment,
    baseUrl,
    apiKey: requiredEnvironment(environment, 'CRAY_API_KEY'),
    requestSigningEnabled,
    signingPrivateKey: requestSigningEnabled
      ? requiredEnvironment(environment, 'CRAY_SIGNING_PRIVATE_KEY').replace(
          /\\n/g,
          '\n',
        )
      : '',
    signingKeyId: requestSigningEnabled
      ? requiredEnvironment(environment, 'CRAY_SIGNING_KEY_ID')
      : '',
    dataEncryptionKey: requiredEnvironment(
      environment,
      'CRAY_DATA_ENCRYPTION_KEY',
    ),
    httpTimeoutMs: Number(
      environment.CRAY_HTTP_TIMEOUT_MS || CRAY_DEFAULT_HTTP_TIMEOUT_MS,
    ),
    maxRetries: 0,
    generalRpm: Number(
      environment.CRAY_GENERAL_RPM || CRAY_DEFAULT_GENERAL_RPM,
    ),
    collectionPayoutRpm: Number(
      environment.CRAY_COLLECTION_PAYOUT_RPM ||
        CRAY_DEFAULT_COLLECTION_PAYOUT_RPM,
    ),
  };
}

describe('Cray live E2E environment contract', () => {
  const required = {
    CRAY_API_KEY: 'staging_merchant_api_key',
    CRAY_DATA_ENCRYPTION_KEY: 'test-encryption-key-at-least-32-bytes',
  };

  it('derives the v1 staging URL when CRAY_BASE_URL is omitted', () => {
    expect(buildLiveOptions(required)).toEqual(
      expect.objectContaining({
        environment: 'staging',
        baseUrl: CRAY_DEFAULT_STAGING_BASE_URL,
        apiKey: required.CRAY_API_KEY,
        dataEncryptionKey: required.CRAY_DATA_ENCRYPTION_KEY,
        requestSigningEnabled: false,
      }),
    );
  });

  it('requires both the merchant key and application encryption secret', () => {
    expect(() =>
      buildLiveOptions({
        CRAY_DATA_ENCRYPTION_KEY: required.CRAY_DATA_ENCRYPTION_KEY,
      }),
    ).toThrow('CRAY_API_KEY');
    expect(() =>
      buildLiveOptions({ CRAY_API_KEY: required.CRAY_API_KEY }),
    ).toThrow('CRAY_DATA_ENCRYPTION_KEY');
  });

  it('rejects production and non-staging gateway overrides', () => {
    expect(() =>
      buildLiveOptions({ ...required, CRAY_ENVIRONMENT: 'production' }),
    ).toThrow('CRAY_ENVIRONMENT=staging');

    expect(() =>
      buildLiveOptions({
        ...required,
        CRAY_BASE_URL: 'https://pay.connectramp.com',
      }),
    ).toThrow('only supports the Cray v1 staging gateway');
  });

  it('requires signing credentials only when ES256 signing is enabled', () => {
    expect(() =>
      buildLiveOptions({
        ...required,
        CRAY_REQUEST_SIGNING_ENABLED: 'true',
      }),
    ).toThrow('CRAY_SIGNING_PRIVATE_KEY');

    expect(
      buildLiveOptions({
        ...required,
        CRAY_REQUEST_SIGNING_ENABLED: 'true',
        CRAY_SIGNING_PRIVATE_KEY: 'line-1\\nline-2',
        CRAY_SIGNING_KEY_ID: 'key-id',
      }),
    ).toEqual(
      expect.objectContaining({
        signingPrivateKey: 'line-1\nline-2',
        signingKeyId: 'key-id',
      }),
    );
  });
});

describeLive('Cray sandbox live contract e2e', () => {
  let client: CrayApiClient;

  beforeAll(() => {
    client = new CrayApiClient(buildLiveOptions());
  });

  it('authenticates with the v1 merchant API key and fetches wallet balances', async () => {
    const response = await client.get<CrayEnvelope>('/api/balance');

    expect(response.data).toBeDefined();
    expect(response.data).not.toBeNull();
    expect(
      Array.isArray(response.data) || typeof response.data === 'object',
    ).toBe(true);
  });

  it('uses the same v1 merchant API key to fetch payout banks', async () => {
    const response = await client.get<CrayEnvelope>('/api/payout/banks');

    expect(Array.isArray(response.data)).toBe(true);
  });
});
