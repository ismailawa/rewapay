# `@rewapay/cray`

NestJS integration for the signed [Cray Finance v1 API](https://docs.crayfi.com/v1). It supports provider-specific virtual accounts, hosted checkout, NGN payouts, refunds, verified webhooks, balance snapshots, and reconciliation.

## Required configuration

Cray v1 uses one merchant API key for every server-side call implemented here and for collection-webhook HMAC verification. Request signing is optional and adds `X-Signature` on top of Bearer authentication; encrypted sensitive-field storage remains mandatory.

```dotenv
CRAY_ENVIRONMENT=staging
CRAY_BASE_URL=https://dev-gateman.v3.connectramp.com
CRAY_API_KEY=replace_with_staging_merchant_api_key
CRAY_REQUEST_SIGNING_ENABLED=false
# Required only when signing is enabled:
CRAY_SIGNING_KEY_ID=
CRAY_SIGNING_PRIVATE_KEY=
CRAY_DATA_ENCRYPTION_KEY=secret_from_your_key_manager
DATABASE_URL=postgresql://...
```

The module fails during startup if the v1 merchant API key or encryption key is missing. Signing key ID/private key are required only when `CRAY_REQUEST_SIGNING_ENABLED=true`. Signed `collection.*` webhooks use the same merchant API key; unsigned legacy `payin` and `payout` events are confirmed through authoritative API requery.

`CRAYFI_PUBLIC_KEY` and `CRAYFI_SECRET_KEY` are credentials for Cray payment-initialization/verification endpoints outside this module's implemented product scope. `CRAYFI_MERCHANT_KEY` is not read as a separate runtime variable: place the staging merchant API-key value in `CRAY_API_KEY`.

## Registration

The host application must configure TypeORM before importing `CrayModule`.

```ts
CrayModule.forRoot({
  environment: 'production',
  baseUrl: 'https://pay.connectramp.com',
  apiKey: process.env.CRAY_API_KEY!,
  requestSigningEnabled: process.env.CRAY_REQUEST_SIGNING_ENABLED === 'true',
  signingKeyId: process.env.CRAY_SIGNING_KEY_ID || '',
  signingPrivateKey: process.env.CRAY_SIGNING_PRIVATE_KEY || '',
  dataEncryptionKey: process.env.CRAY_DATA_ENCRYPTION_KEY!,
  httpTimeoutMs: 15_000,
  maxRetries: 3,
  generalRpm: 60,
  collectionPayoutRpm: 30,
});
```

Inject `CRAY_SERVICE` as `ICrayService`. Funding requires real customer details:

```ts
await cray.createFundingSession({
  customerId: 'customer-id',
  walletId: 'wallet-id',
  amount: '100.00',
  reference: 'unique-reference',
  method: 'transfer',
  customer: { name: 'Jane Doe', email: 'jane@example.com' },
  callbackUrl: 'https://merchant.example/payments/return',
});
```

Only `POST /cray/webhooks` is registered as a public controller. Bank, payout, checkout, balance, and reconciliation operations are exposed through the in-process service so the host controls authorization.

## Database and verification

Start the local PostgreSQL infrastructure, then run the security backfill migration with `CRAY_DATA_ENCRYPTION_KEY` set:

```bash
cp .env.example .env
npm run infra:up
npm run migration:run
npm test -- --runInBand
npm run build
npm run test:e2e -- --runInBand
```

`compose.yaml` starts PostgreSQL 16 with a persistent named volume, readiness health check, and the UUID extension required by the migration. Use `npm run infra:logs` to follow database logs and `npm run infra:down` to stop the container without deleting its data.

The local database is published on host port `5433` to avoid collisions with a system PostgreSQL instance on the conventional `5432` port.

The migration encrypts existing account numbers using AES-256-GCM, adds deterministic lookup hashes/last-four fields, redacts legacy webhook payloads, and creates refund persistence. Sandbox contract verification requires a real v1 staging merchant API key; a registered signing key is additionally required when the sandbox merchant has signing enabled.

The normal live suite is read-only and production-guarded:

```bash
npm run test:e2e:live
```

Virtual-account creation is a production mutation and has a separate explicit opt-in. This command creates a permanent Bloc account with a fresh reference on every run:

```bash
npm run test:e2e:live:virtual-account
```
