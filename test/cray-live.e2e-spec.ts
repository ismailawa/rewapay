import 'dotenv/config';
import { randomUUID } from 'crypto';
import { AccountsService } from '../src/modules/cray/accounts/accounts.service';
import { CrayApiClient } from '../src/modules/cray/clients/cray-api.client';
import { CrayModuleOptions } from '../src/modules/cray/config/cray.config';
import {
  CRAY_DEFAULT_COLLECTION_PAYOUT_RPM,
  CRAY_DEFAULT_GENERAL_RPM,
  CRAY_DEFAULT_HTTP_TIMEOUT_MS,
  CRAY_DEFAULT_PRODUCTION_BASE_URL,
} from '../src/modules/cray/config/cray.constants';

interface CrayEnvelope {
  status?: boolean | string;
  message?: string;
  data?: unknown;
}

const liveEnabled = process.env.RUN_CRAY_LIVE_E2E === 'true';
const liveMutationEnabled =
  liveEnabled && process.env.RUN_CRAY_LIVE_MUTATION_E2E === 'true';
const configuredHttpTimeoutMs =
  Number(process.env.CRAY_HTTP_TIMEOUT_MS) || CRAY_DEFAULT_HTTP_TIMEOUT_MS;
const liveTestTimeoutMs =
  Number(process.env.CRAY_LIVE_E2E_TIMEOUT_MS) ||
  configuredHttpTimeoutMs + 5_000;
const describeLiveReadOnly =
  liveEnabled && !liveMutationEnabled ? describe : describe.skip;
const describeLiveMutation = liveMutationEnabled ? describe : describe.skip;

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
  const crayEnvironment = environment.CRAY_ENVIRONMENT?.trim();
  if (crayEnvironment !== 'staging') {
    throw new Error('Live E2E requires CRAY_ENVIRONMENT=staging.');
  }

  const baseUrl = (
    environment.CRAY_BASE_URL?.trim() || CRAY_DEFAULT_PRODUCTION_BASE_URL
  ).replace(/\/$/, '');
  if (baseUrl !== CRAY_DEFAULT_PRODUCTION_BASE_URL) {
    throw new Error(
      `Live E2E only supports the Cray v1 production gateway: ${CRAY_DEFAULT_PRODUCTION_BASE_URL}.`,
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
    CRAY_ENVIRONMENT: 'staging',
    CRAY_API_KEY: 'staging_merchant_api_key',
    CRAY_DATA_ENCRYPTION_KEY: 'test-encryption-key-at-least-32-bytes',
  };

  it('uses staging configuration with the v1 production URL', () => {
    expect(buildLiveOptions(required)).toEqual(
      expect.objectContaining({
        environment: 'staging',
        baseUrl: CRAY_DEFAULT_PRODUCTION_BASE_URL,
        apiKey: required.CRAY_API_KEY,
        dataEncryptionKey: required.CRAY_DATA_ENCRYPTION_KEY,
        requestSigningEnabled: false,
      }),
    );
  });

  it('requires both the merchant key and application encryption secret', () => {
    expect(() =>
      buildLiveOptions({
        CRAY_ENVIRONMENT: required.CRAY_ENVIRONMENT,
        CRAY_DATA_ENCRYPTION_KEY: required.CRAY_DATA_ENCRYPTION_KEY,
      }),
    ).toThrow('CRAY_API_KEY');
    expect(() =>
      buildLiveOptions({
        CRAY_ENVIRONMENT: required.CRAY_ENVIRONMENT,
        CRAY_API_KEY: required.CRAY_API_KEY,
      }),
    ).toThrow('CRAY_DATA_ENCRYPTION_KEY');
  });

  it('rejects non-staging environments and gateway overrides', () => {
    expect(() =>
      buildLiveOptions({ ...required, CRAY_ENVIRONMENT: 'production' }),
    ).toThrow('CRAY_ENVIRONMENT=staging');

    expect(() =>
      buildLiveOptions({
        ...required,
        CRAY_BASE_URL: 'https://dev-gateman.v3.connectramp.com',
      }),
    ).toThrow('only supports the Cray v1 production gateway');
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

describeLiveReadOnly('Cray staging credentials on production gateway e2e', () => {
  let client: CrayApiClient;

  beforeAll(() => {
    client = new CrayApiClient(buildLiveOptions());
  });

  it(
    'authenticates with the v1 merchant API key and fetches wallet balances',
    async () => {
      const response = await client.get<CrayEnvelope>('/api/balance');

      expect(response.data).toBeDefined();
      expect(response.data).not.toBeNull();
      expect(
        Array.isArray(response.data) || typeof response.data === 'object',
      ).toBe(true);
    },
    liveTestTimeoutMs,
  );

  it(
    'uses the same v1 merchant API key to fetch payout banks',
    async () => {
      const response = await client.get<CrayEnvelope>('/api/payout/banks');

      expect(Array.isArray(response.data)).toBe(true);
    },
    liveTestTimeoutMs,
  );
});

describeLiveMutation(
  'Cray staging virtual-account contract on production gateway e2e',
  () => {
    let accountsService: AccountsService;

    beforeAll(() => {
      const options = buildLiveOptions();
      accountsService = new AccountsService(
        new CrayApiClient(options),
        options,
      );
    });

    it(
      'creates a permanent individual Bloc virtual account',
      async () => {
        const customerId = `live-va-${randomUUID()}`;
        const created = await accountsService.createVirtualAccount({
          customerId,
          accountType: 'Permanent',
          provider: 'Bloc',
          accountName: 'Prin Test',
          email: 'pess@example.com',
          firstName: 'Prin',
          lastName: 'Test',
          dateOfBirth: '1982-10-23',
        });
        const persisted = await accountsService.getVirtualAccount(customerId);

        expect(typeof created.accountNumber).toBe('string');
        expect(created.accountNumber.length).toBeGreaterThan(0);
        expect(typeof created.accountName).toBe('string');
        expect(created.accountName.length).toBeGreaterThan(0);
        expect(typeof created.bankName).toBe('string');
        expect(created.bankName.length).toBeGreaterThan(0);
        expect(typeof persisted?.accountNumber).toBe('string');
        expect(persisted?.accountNumber.length).toBeGreaterThan(0);
      },
      liveTestTimeoutMs,
    );
  },
);
