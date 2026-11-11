import { Inject, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';
import type { CrayModuleOptions } from '../config/cray.config';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import { CrayErrorMapper } from './cray-error.mapper';
import { CrayRateLimiter } from './cray-rate-limiter';
import { CraySigner } from './cray-signer';

/**
 * Endpoints that bypass X-Signature (Payment Initialization flow).
 * These use inline `public_key`/`secret_key` credentials instead.
 * Docs: https://docs.crayfi.com/v2/collections/payment-initialization
 */
const UNSIGNED_PATHS = new Set([
  '/payments/initialize',
  '/payments/initialize/new',
  '/payment/initialize',
  '/payment/create',
  '/payment/merchant/create',
]);

/** Returns true when the endpoint uses inline auth (no Bearer, no X-Signature). */
function isUnsignedEndpoint(url: string): boolean {
  const path = url.split('?')[0].replace(/\/+$/, '');
  if (UNSIGNED_PATHS.has(path)) return true;
  // GET /payment/merchant/verify/{ref}/{key} carries the secret key in the path
  if (/^\/payment\/merchant\/verify\//.test(path)) return true;
  return false;
}

@Injectable()
export class CrayApiClient {
  private readonly logger = new Logger(CrayApiClient.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly rateLimiter: CrayRateLimiter;

  constructor(
    @Inject(CRAY_MODULE_OPTIONS)
    private readonly options: CrayModuleOptions,
  ) {
    this.rateLimiter = new CrayRateLimiter(
      options.generalRpm,
      options.collectionPayoutRpm,
    );

    this.axiosInstance = axios.create({
      baseURL: options.baseUrl,
      timeout: options.httpTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  get axios(): AxiosInstance {
    return this.axiosInstance;
  }

  get rateLimiterInstance(): CrayRateLimiter {
    return this.rateLimiter;
  }

  /** Public key (`lrp_...`) for Payment Initialization request bodies. */
  get publicKey(): string | undefined {
    return this.options.publicKey;
  }

  /** Secret key (`lrs_...`) for the payment-verify URL path. */
  get secretKey(): string | undefined {
    return this.options.secretKey;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>({
      ...config,
      method: 'GET',
      url,
    });
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>({
      ...config,
      method: 'POST',
      url,
      data,
    });
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>({
      ...config,
      method: 'PUT',
      url,
      data,
    });
  }

  private async executeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const url = config.url || '';
    const category = CrayRateLimiter.categorizeEndpoint(url);

    // 1. Throttle / Rate limiting
    await this.rateLimiter.acquire(category);

    // 2. Serialise the body ONCE — the exact bytes that will be sent and hashed
    const bodyBytes: string =
      config.data == null
        ? ''
        : typeof config.data === 'string'
          ? config.data
          : JSON.stringify(config.data);

    // Lock the wire payload so the hash and the bytes sent are identical
    if (config.data != null && typeof config.data !== 'string') {
      config.data = bodyBytes;
    }

    // 3. Build canonical path (path + sorted query string)
    const method = (config.method || 'GET').toUpperCase();
    let pathWithQuery = url;
    if (config.params) {
      const query = new URLSearchParams(config.params).toString();
      if (query) {
        pathWithQuery += (url.includes('?') ? '&' : '?') + query;
      }
    }

    // 4. Determine whether this endpoint needs signing
    const skipSigning = isUnsignedEndpoint(url);

    // 4a. Build base headers — no Authorization on unsigned (payment-init) endpoints
    const headers: Record<string, string> = {
      ...(config.headers as Record<string, string>),
    };

    if (!skipSigning && this.options.apiToken) {
      headers['Authorization'] = `Bearer ${this.options.apiToken}`;
    }

    // 4b. Attach X-Signature when:
    //   - endpoint is not in the unsigned set, AND
    //   - signing is enabled in config (requestSigningEnabled === true), AND
    //   - a private key is configured
    //
    // Docs: signing is REQUIRED by default on every endpoint under the base URL.
    // Set CRAY_REQUEST_SIGNING_ENABLED=true + CRAY_SIGNING_PRIVATE_KEY to enable.
    const shouldSign =
      !skipSigning &&
      this.options.requestSigningEnabled &&
      !!this.options.signingPrivateKey;

    // 5. Execute with per-attempt nonce (GET retries need a fresh nonce each time)
    const isGet = method === 'GET';
    const maxRetries = isGet ? this.options.maxRetries : 0;
    let attempt = 0;

    while (attempt <= maxRetries) {
      // Build fresh X-Signature for every attempt (nonce must be unique per request)
      const attemptHeaders = { ...headers };

      if (shouldSign) {
        const timestampMs = Date.now();
        const nonce = randomUUID();

        const canonicalMessage = CraySigner.buildCanonicalMessage({
          method,
          pathWithQuery,
          timestampMs,
          nonce,
          bodyBytes,
        });

        const signature = CraySigner.sign(
          canonicalMessage,
          this.options.signingPrivateKey!,
        );

        attemptHeaders['X-Signature'] = CraySigner.formatHeader({
          timestampMs,
          nonce,
          signature,
          keyId: this.options.signingKeyId,
        });

        this.logger.debug(
          `[Cray] Signed ${method} ${url} | kid=${this.options.signingKeyId ?? 'none'} | t=${timestampMs} | n=${nonce}`,
        );
      } else if (!skipSigning && this.options.requestSigningEnabled) {
        // Signing is enabled in config but private key is missing — warn loudly
        this.logger.warn(
          `[Cray] requestSigningEnabled=true but no signingPrivateKey configured. ` +
          `Request to ${method} ${url} will be sent without X-Signature and may be rejected with SIGNATURE_REQUIRED.`,
        );
      }

      try {
        const response: AxiosResponse<T> = await this.axiosInstance.request<T>({
          ...config,
          headers: attemptHeaders,
        });
        return response.data;
      } catch (err) {
        const mappedError = CrayErrorMapper.fromAxiosError(err);
        attempt++;

        if (mappedError.retryable && attempt <= maxRetries) {
          const delay =
            process.env.NODE_ENV === 'test'
              ? 10
              : Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 10000);
          this.logger.warn(
            `[Cray] Transient error (${mappedError.message}). Retrying ${method} ${url} ` +
            `attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`,
          );
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        throw mappedError;
      }
    }

    throw new Error('Unexpected retry loop termination');
  }
}

