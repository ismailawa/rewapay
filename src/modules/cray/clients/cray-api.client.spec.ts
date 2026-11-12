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
    collectionApiKey: 'test-collection-token',
    disbursementApiKey: 'test-disbursement-token',
    requestSigningEnabled: true,
    signingPrivateKey: privateKeyPem,
    signingKeyId: '11111111-1111-4111-8111-111111111111',
    webhookKeys: ['test-webhook-key'],
    dataEncryptionKey: 'test-data-encryption-key',
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

    const result = await client.get('/balance');
    expect(result).toEqual({ success: true });
    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-collection-token',
        }),
      }),
    );
  });

  it('should generate and attach a valid ES256 signature when enabled', async () => {
    const options = createOptions();
    const client = new CrayApiClient(options);

    let capturedHeaders: Record<string, string> = {};
    jest.spyOn(client.axios, 'request').mockImplementation((config) => {
      capturedHeaders = (config.headers as Record<string, string>) || {};
      return Promise.resolve({ data: { message: 'Signed OK' } } as never);
    });

    const body = { customer_email: 'test@example.com' };
    await client.post('/virtual-accounts/create', body);

    expect(capturedHeaders['X-Signature']).toBeDefined();
    const sigHeader = capturedHeaders['X-Signature'];
    expect(sigHeader).toContain('t=');
    expect(sigHeader).toContain('n=');
    expect(sigHeader).toContain('v1=');
    expect(sigHeader).toContain('kid=11111111-1111-4111-8111-111111111111');

    const params = Object.fromEntries(
      sigHeader.split(',').map((p) => {
        const [k, ...v] = p.split('=');
        return [k, v.join('=')];
      }),
    );

    // Verify signature against canonical message
    const canonicalMessage = CraySigner.buildCanonicalMessage({
      method: 'POST',
      pathWithQuery: '/virtual-accounts/create',
      timestampMs: params['t'],
      nonce: params['n'],
      bodyBytes: JSON.stringify(body),
    });

    const isValid = CraySigner.verify(
      canonicalMessage,
      params['v1'],
      publicKeyPem,
    );
    expect(isValid).toBe(true);
  });

  it('should authenticate without X-Signature when request signing is disabled', async () => {
    const client = new CrayApiClient(createOptions({
      requestSigningEnabled: false,
      signingPrivateKey: '',
      signingKeyId: '',
    }));
    const requestSpy = jest.spyOn(client.axios, 'request').mockResolvedValue({ data: {} } as never);
    await client.get('/balance');
    const headers = requestSpy.mock.calls[0][0].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-collection-token');
    expect(headers['X-Signature']).toBeUndefined();
  });

  it('should route payout requests through the disbursement-scoped key', async () => {
    const client = new CrayApiClient(createOptions());
    const requestSpy = jest.spyOn(client.axios, 'request').mockResolvedValue({ data: {} } as never);
    await client.get('/payout/banks');
    expect(requestSpy).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-disbursement-token' }),
    }));
  });

  it('transmits the same sorted and encoded query path that it signs', async () => {
    const client = new CrayApiClient(createOptions());
    const requestSpy = jest.spyOn(client.axios, 'request').mockResolvedValue({ data: {} } as never);
    await client.get('/balance?search=a+b&currency=NGN');
    expect(requestSpy).toHaveBeenCalledWith(expect.objectContaining({
      url: '/balance?currency=NGN&search=a%2Bb',
    }));
  });

  it('should reject incomplete security configuration at startup', () => {
    expect(() => new CrayApiClient(createOptions({ signingKeyId: '' }))).toThrow('signingKeyId');
    expect(() => new CrayApiClient(createOptions({
      requestSigningEnabled: false,
      signingKeyId: '',
      signingPrivateKey: '',
    }))).not.toThrow();
    expect(() => new CrayApiClient(createOptions({ webhookKeys: [] }))).toThrow('webhookKeys');
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
    const firstSignature = (requestSpy.mock.calls[0][0].headers as Record<string, string>)['X-Signature'];
    const secondSignature = (requestSpy.mock.calls[1][0].headers as Record<string, string>)['X-Signature'];
    const nonce = (value: string) => value.split(',').find((part) => part.startsWith('n='));
    expect(nonce(firstSignature)).toBeDefined();
    expect(nonce(secondSignature)).toBeDefined();
    expect(nonce(firstSignature)).not.toBe(nonce(secondSignature));
  });
});
