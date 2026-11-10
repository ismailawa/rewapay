import * as crypto from 'crypto';
import { CrayModuleOptions } from '../config/cray.config';
import { CrayErrorCode } from '../enums/cray.enums';
import { CrayException } from '../interfaces/cray.interfaces';
import { CrayApiClient } from './cray-api.client';
import { CraySigner } from './cray-signer';

describe('CrayApiClient', () => {
  let privateKeyPem: string;
  let publicKeyPem: string;

  beforeAll(() => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    privateKeyPem = privateKey;
    publicKeyPem = publicKey;
  });

  const createOptions = (overrides?: Partial<CrayModuleOptions>): CrayModuleOptions => ({
    environment: 'staging',
    baseUrl: 'https://dev-gateman.v3.connectramp.com',
    apiToken: 'test-api-token',
    requestSigningEnabled: false,
    signingPrivateKey: undefined,
    webhookSecret: 'secret',
    webhookAllowedIps: [],
    httpTimeoutMs: 5000,
    maxRetries: 2,
    generalRpm: 60,
    collectionPayoutRpm: 30,
    ...overrides,
  });

  it('should attach Bearer token to request headers', async () => {
    const options = createOptions();
    const client = new CrayApiClient(options);

    const mockResponse = { data: { success: true } };
    const requestSpy = jest
      .spyOn(client.axios, 'request')
      .mockResolvedValue(mockResponse as never);

    const result = await client.get('/api/balance');
    expect(result).toEqual({ success: true });
    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-token',
        }),
      }),
    );
  });

  it('should generate and attach valid ES256 signature when requestSigningEnabled is true', async () => {
    const options = createOptions({
      requestSigningEnabled: true,
      signingPrivateKey: privateKeyPem,
    });
    const client = new CrayApiClient(options);

    let capturedHeaders: Record<string, string> = {};
    jest.spyOn(client.axios, 'request').mockImplementation((config) => {
      capturedHeaders = (config.headers as Record<string, string>) || {};
      return Promise.resolve({ data: { message: 'Signed OK' } } as never);
    });

    const body = { customer_email: 'test@example.com' };
    await client.post('/api/virtual-accounts/create', body);

    expect(capturedHeaders['X-Signature']).toBeDefined();
    expect(capturedHeaders['X-Timestamp']).toBeDefined();
    expect(capturedHeaders['X-Nonce']).toBeDefined();

    // Verify signature against canonical message
    const canonicalMessage = CraySigner.buildCanonicalMessage({
      method: 'POST',
      pathWithQuery: '/api/virtual-accounts/create',
      timestampMs: capturedHeaders['X-Timestamp'],
      nonce: capturedHeaders['X-Nonce'],
      bodyBytes: JSON.stringify(body),
    });

    const isValid = CraySigner.verify(
      canonicalMessage,
      capturedHeaders['X-Signature'],
      publicKeyPem,
    );
    expect(isValid).toBe(true);
  });

  it('should map Axios errors to typed CrayException', async () => {
    const options = createOptions();
    const client = new CrayApiClient(options);

    const axiosError = {
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: 'Reference already used' },
      },
    };
    jest.spyOn(client.axios, 'request').mockRejectedValue(axiosError);

    await expect(client.post('/payout/disburse', { amount: '100.00' })).rejects.toThrow(
      CrayException,
    );

    try {
      await client.post('/payout/disburse', { amount: '100.00' });
    } catch (err) {
      const crayErr = err as CrayException;
      expect(crayErr.code).toBe(CrayErrorCode.DUPLICATE_REFERENCE);
      expect(crayErr.retryable).toBe(false);
    }
  });

  it('should retry idempotent GET requests when encountering retryable 5xx error', async () => {
    const options = createOptions({ maxRetries: 2 });
    const client = new CrayApiClient(options);

    const serverError = {
      isAxiosError: true,
      response: {
        status: 503,
        data: { message: 'Service Unavailable' },
      },
    };

    const successResponse = { data: { banks: [] } };

    const requestSpy = jest
      .spyOn(client.axios, 'request')
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce(successResponse as never);

    const result = await client.get('/payout/banks?countryCode=NG');
    expect(result).toEqual({ banks: [] });
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });
});

