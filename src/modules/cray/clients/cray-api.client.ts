import { Inject, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';
import type { CrayModuleOptions } from '../config/cray.config';
import { CRAY_MODULE_OPTIONS } from '../config/cray.constants';
import { CrayErrorMapper } from './cray-error.mapper';
import { CrayRateLimiter } from './cray-rate-limiter';
import { CraySigner } from './cray-signer';

@Injectable()
export class CrayApiClient {
  private readonly logger = new Logger(CrayApiClient.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly rateLimiter: CrayRateLimiter;

  constructor(
    @Inject(CRAY_MODULE_OPTIONS)
    private readonly options: CrayModuleOptions,
  ) {
    this.validateConfiguration();
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

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>({
      ...config,
      method: 'GET',
      url,
    });
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.executeRequest<T>({
      ...config,
      method: 'POST',
      url,
      data,
    });
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
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
    // Transmit the same normalized path/query bytes that are signed. This is
    // especially important for literal '+' values, which must be sent as %2B.
    pathWithQuery = CraySigner.canonicalizePath(pathWithQuery);
    config.url = pathWithQuery;
    delete config.params;

    // 4. Cray v1 uses one merchant Secret Key for every server-side endpoint.
    const headers: Record<string, string> = {
      ...(config.headers as Record<string, string>),
      Authorization: `Bearer ${this.options.apiKey}`,
    };

    // 5. Execute. When signing is enabled, every attempt gets a fresh nonce.
    const isGet = method === 'GET';
    const maxRetries = isGet ? this.options.maxRetries : 0;
    let attempt = 0;

    while (attempt <= maxRetries) {
      const attemptHeaders = { ...headers };
      if (this.options.requestSigningEnabled) {
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
          this.options.signingPrivateKey,
        );
        attemptHeaders['X-Signature'] = CraySigner.formatHeader({
          timestampMs,
          nonce,
          signature,
          keyId: this.options.signingKeyId,
        });
        this.logger.debug(
          `[Cray] Signed ${method} ${url} | kid=${this.options.signingKeyId} | t=${timestampMs} | n=${nonce}`,
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
              : Math.min(
                  1000 * Math.pow(2, attempt) + Math.random() * 200,
                  10000,
                );
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

  private validateConfiguration(): void {
    const missing = [
      ['apiKey', this.options.apiKey],
      ['dataEncryptionKey', this.options.dataEncryptionKey],
      ...(this.options.requestSigningEnabled
        ? [
            ['signingPrivateKey', this.options.signingPrivateKey],
            ['signingKeyId', this.options.signingKeyId],
          ]
        : []),
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(
        `Invalid Cray configuration: missing ${missing.join(', ')}`,
      );
    }
  }
}
