import 'dotenv/config';
import { CrayApiClient } from '../src/modules/cray/clients/cray-api.client';
import { CrayModuleOptions } from '../src/modules/cray/config/cray.config';

interface CrayEnvelope {
  status?: boolean | string;
  message?: string;
  data?: unknown;
}

const liveEnabled = process.env.RUN_CRAY_LIVE_E2E === 'true';
const describeLive = liveEnabled ? describe : describe.skip;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /replace_with/i.test(value)) {
    throw new Error(`${name} must contain a real Cray sandbox value.`);
  }
  if (name.endsWith('_API_KEY') && !value.startsWith('lrs_')) {
    throw new Error(`${name} must be a Cray Secret Key beginning with lrs_.`);
  }
  return value;
}

describeLive('Cray sandbox live contract e2e', () => {
  let client: CrayApiClient;

  beforeAll(() => {
    const baseUrl = requiredEnvironment('CRAY_BASE_URL').replace(/\/$/, '');
    const allowProduction = process.env.CRAY_LIVE_ALLOW_PRODUCTION === 'true';
    if (!baseUrl.includes('dev-gateman.v3.connectramp.com') && !allowProduction) {
      throw new Error(
        'Live E2E is restricted to the v1 ConnectRamp staging gateway. Set CRAY_LIVE_ALLOW_PRODUCTION=true only for an explicitly approved production check.',
      );
    }

    const requestSigningEnabled =
      process.env.CRAY_REQUEST_SIGNING_ENABLED?.toLowerCase() === 'true';
    const options: CrayModuleOptions = {
      environment: baseUrl.includes('dev-gateman.v3.connectramp.com')
        ? 'staging'
        : 'production',
      baseUrl,
      apiKey: requiredEnvironment('CRAY_API_KEY'),
      requestSigningEnabled,
      signingPrivateKey: requestSigningEnabled
        ? requiredEnvironment('CRAY_SIGNING_PRIVATE_KEY').replace(/\\n/g, '\n')
        : '',
      signingKeyId: requestSigningEnabled
        ? requiredEnvironment('CRAY_SIGNING_KEY_ID')
        : '',
      dataEncryptionKey: 'live-suite-placeholder-at-least-32-bytes',
      httpTimeoutMs: Number(process.env.CRAY_HTTP_TIMEOUT_MS || 15000),
      maxRetries: 0,
      generalRpm: Number(process.env.CRAY_GENERAL_RPM || 60),
      collectionPayoutRpm: Number(process.env.CRAY_COLLECTION_PAYOUT_RPM || 30),
    };

    client = new CrayApiClient(options);
  });

  it('authenticates with the v1 Secret Key and fetches wallet balances', async () => {
    const response = await client.get<CrayEnvelope>('/api/balance');

    expect(response.data).toBeDefined();
    expect(response.data).not.toBeNull();
    expect(
      Array.isArray(response.data) || typeof response.data === 'object',
    ).toBe(true);
  });

  it('uses the same v1 Secret Key to fetch payout banks', async () => {
    const response = await client.get<CrayEnvelope>('/api/payout/banks');

    expect(Array.isArray(response.data)).toBe(true);
  });
});
