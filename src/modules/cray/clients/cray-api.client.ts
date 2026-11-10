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

    // 2. Prepare headers
    const headers: Record<string, string> = {
      ...(config.headers as Record<string, string>),
    };

    if (this.options.apiToken) {
      headers['Authorization'] = `Bearer ${this.options.apiToken}`;
    }

    // 3. Request Signing (ES256)
    if (this.options.requestSigningEnabled && this.options.signingPrivateKey) {
      const method = (config.method || 'GET').toUpperCase();
      let pathWithQuery = url;
      if (config.params) {
        const query = new URLSearchParams(config.params).toString();
        if (query) {
          pathWithQuery += (url.includes('?') ? '&' : '?') + query;
        }
      }

      const timestampMs = Date.now();
      const nonce = randomUUID();
      const bodyBytes = config.data
        ? typeof config.data === 'string'
          ? config.data
          : JSON.stringify(config.data)
        : '';

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

      headers['X-Signature'] = signature;
      headers['X-Timestamp'] = timestampMs.toString();
      headers['X-Nonce'] = nonce;

      // Ensure JSON payload is transmitted identically as hashed
      if (config.data && typeof config.data !== 'string') {
        config.data = bodyBytes;
      }
    }

    config.headers = headers;

    // 4. Execute with retry for safe idempotent read requests
    const maxRetries = (config.method?.toUpperCase() === 'GET') ? this.options.maxRetries : 0;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response: AxiosResponse<T> = await this.axiosInstance.request<T>(config);
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
            `Transient error connecting to Cray (${mappedError.message}). Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`,
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
