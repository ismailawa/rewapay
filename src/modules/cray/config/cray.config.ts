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
  apiToken: string;
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

export const crayConfig = registerAs('cray', (): CrayModuleOptions => {
  const environment = (process.env.CRAY_ENVIRONMENT as 'staging' | 'production' | 'test') || 'staging';
  const defaultBaseUrl =
    environment === 'production'
      ? CRAY_DEFAULT_PRODUCTION_BASE_URL
      : CRAY_DEFAULT_STAGING_BASE_URL;

  return {
    environment,
    baseUrl: process.env.CRAY_BASE_URL || defaultBaseUrl,
    apiToken: process.env.CRAY_API_TOKEN || '',
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
