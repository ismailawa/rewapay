# `@rewapay/cray`

NestJS integration for the signed [Cray Finance v2 API](https://docs.crayfi.com/v2). It supports provider-specific virtual accounts, hosted checkout, NGN payouts, refunds, verified webhooks, balance snapshots, and reconciliation.

## Required configuration

Cray Secret Keys carry exactly one scope. Collection and disbursement calls therefore require different Bearer keys. Request signing is optional and adds `X-Signature` on top of Bearer authentication; encrypted sensitive-field storage remains mandatory.

```dotenv
CRAY_ENVIRONMENT=staging
CRAY_BASE_URL=https://sandbox.crayfi.io
CRAY_COLLECTION_API_KEY=collection_scoped_key
CRAY_DISBURSEMENT_API_KEY=disbursement_scoped_key
CRAY_REQUEST_SIGNING_ENABLED=false
# Required only when signing is enabled:
CRAY_SIGNING_KEY_ID=
CRAY_SIGNING_PRIVATE_KEY=
CRAY_WEBHOOK_KEYS=webhook_scope_key_current,webhook_scope_key_previous
CRAY_DATA_ENCRYPTION_KEY=secret_from_your_key_manager
DATABASE_URL=postgresql://...
```

The module always fails during startup if either scoped Bearer key, all webhook keys, or the encryption key is missing. Signing key ID/private key are required only when `CRAY_REQUEST_SIGNING_ENABLED=true`. Webhook keys support rotation; Cray's `Cray-Webhook-Key` hint selects a key by its final four characters.

## Registration

The host application must configure TypeORM before importing `CrayModule`.

```ts
CrayModule.forRoot({
  environment: 'production',
  baseUrl: 'https://pay.crayfi.io',
  collectionApiKey: process.env.CRAY_COLLECTION_API_KEY!,
  disbursementApiKey: process.env.CRAY_DISBURSEMENT_API_KEY!,
  requestSigningEnabled: process.env.CRAY_REQUEST_SIGNING_ENABLED === 'true',
  signingKeyId: process.env.CRAY_SIGNING_KEY_ID || '',
  signingPrivateKey: process.env.CRAY_SIGNING_PRIVATE_KEY || '',
  webhookKeys: process.env.CRAY_WEBHOOK_KEYS!.split(','),
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

The migration encrypts existing account numbers using AES-256-GCM, adds deterministic lookup hashes/last-four fields, redacts legacy webhook payloads, and creates refund persistence. Sandbox contract verification requires real test-scoped Cray keys; a registered signing key is additionally required when the sandbox merchant has signing enabled.
