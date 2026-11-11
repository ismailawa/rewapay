import { registerAs } from '@nestjs/config';
import {
  CRAY_DEFAULT_COLLECTION_PAYOUT_RPM,
  CRAY_DEFAULT_GENERAL_RPM,
  CRAY_DEFAULT_HTTP_TIMEOUT_MS,
  CRAY_DEFAULT_MAX_RETRIES,
  CRAY_DEFAULT_PRODUCTION_BASE_URL,
  CRAY_DEFAULT_STAGING_BASE_URL,
} from './cray.constants';

export interface CrayModuleOptions {
  environment: 'staging' | 'production' | 'test';
  baseUrl: string;
  /**
   * Scoped API key (collection / disbursement / conversion).
   * Sent as `Authorization: Bearer <apiToken>` on every main API request.
   * Maps to CRAYFI_MERCHANT_KEY_TEST (staging) or the live merchant key.
   */
  apiToken: string;
  /**
   * Public key (`lrp_...`) sent in the request body for Payment Initialization
   * endpoints (/payments/initialize, /payment/create, etc.).
   * Maps to CRAYFI_PUBLIC_KEY_TEST (staging) or the live public key.
   */
  publicKey?: string;
  /**
   * Secret key (`lrs_...`) used in the URL path for the payment-verify endpoint:
   * GET /payment/merchant/verify/{referenceCode}/{secretKey}
   * Maps to CRAYFI_SECRET_KEY_TEST (staging) or the live secret key.
   * Never send in a browser or log full request URLs when this is in the path.
   */
  secretKey?: string;
  requestSigningEnabled: boolean;
  signingPrivateKey?: string;
  signingKeyId?: string; // kid registered in Cray Dashboard
  webhookSecret?: string;
  webhookAllowedIps: string[];
  httpTimeoutMs: number;
  maxRetries: number;
  generalRpm: number;
  collectionPayoutRpm: number;
}

export interface CrayOptionsFactory {
  createCrayOptions(): Promise<Partial<CrayModuleOptions>> | Partial<CrayModuleOptions>;
}

export interface CrayModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<Partial<CrayModuleOptions>> | Partial<CrayModuleOptions>;
  inject?: any[];
  useClass?: any;
  useExisting?: any;
}

export const crayConfig = registerAs('cray', (): CrayModuleOptions => {
  const environment = (process.env.CRAY_ENVIRONMENT as 'staging' | 'production' | 'test') || 'staging';
  const defaultBaseUrl =
    environment === 'production'
      ? CRAY_DEFAULT_PRODUCTION_BASE_URL
      : CRAY_DEFAULT_STAGING_BASE_URL;

  return {
    environment,
    baseUrl: process.env.CRAY_BASE_URL || defaultBaseUrl,
    // Scoped merchant API key — Bearer token for main API endpoints
    apiToken: process.env.CRAYFI_MERCHANT_KEY_TEST || process.env.CRAY_API_TOKEN || '',
    // Payment Initialization inline credentials
    publicKey: process.env.CRAYFI_PUBLIC_KEY_TEST,
    secretKey: process.env.CRAYFI_SECRET_KEY_TEST,
    requestSigningEnabled: process.env.CRAY_REQUEST_SIGNING_ENABLED === 'true',
    signingPrivateKey: process.env.CRAY_SIGNING_PRIVATE_KEY,
    signingKeyId: process.env.CRAY_SIGNING_KEY_ID,
    webhookSecret: process.env.CRAY_WEBHOOK_SECRET,
    webhookAllowedIps: process.env.CRAY_WEBHOOK_ALLOWED_IPS
      ? process.env.CRAY_WEBHOOK_ALLOWED_IPS.split(',').map((ip) => ip.trim())
      : [],
    httpTimeoutMs: process.env.CRAY_HTTP_TIMEOUT_MS
      ? parseInt(process.env.CRAY_HTTP_TIMEOUT_MS, 10)
      : CRAY_DEFAULT_HTTP_TIMEOUT_MS,
    maxRetries: process.env.CRAY_MAX_RETRIES
      ? parseInt(process.env.CRAY_MAX_RETRIES, 10)
      : CRAY_DEFAULT_MAX_RETRIES,
    generalRpm: process.env.CRAY_GENERAL_RPM
      ? parseInt(process.env.CRAY_GENERAL_RPM, 10)
      : CRAY_DEFAULT_GENERAL_RPM,
    collectionPayoutRpm: process.env.CRAY_COLLECTION_PAYOUT_RPM
      ? parseInt(process.env.CRAY_COLLECTION_PAYOUT_RPM, 10)
      : CRAY_DEFAULT_COLLECTION_PAYOUT_RPM,
  };
});
