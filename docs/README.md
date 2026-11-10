# Cray API Documentation Reference & Integration Guide (v2)

This folder contains the official API reference documentation retrieved from **https://docs.crayfi.com/v2** for offline reference, integration validation, and contract verification.

- **Full Documentation Dump:** [cray-api-v2-docs.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/docs/cray-api-v2-docs.md) (retrieved from `https://docs.crayfi.com/llms-full.txt`)
- **Task Checklist & Acceptance Criteria:** [task-checklist.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/docs/task-checklist.md)
- **Roadmap & Progress Status:** [STATUS.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/STATUS.md)

---

## 1. Module Consumption Guide (`@rewapay/cray`)

The `@rewapay/cray` module is an in-process NestJS module designed to be imported directly into the RewaPay wallet and core backend applications.

### Registration in AppModule

```typescript
import { Module } from '@nestjs/common';
import { CrayModule } from './modules/cray';

@Module({
  imports: [
    CrayModule.forRoot({
      environment: 'production', // 'staging' | 'production' | 'test'
      apiToken: process.env.CRAY_API_TOKEN,
      requestSigningEnabled: true,
      signingPrivateKey: process.env.CRAY_SIGNING_PRIVATE_KEY,
      signingKeyId: process.env.CRAY_SIGNING_KEY_ID,
      webhookSecret: process.env.CRAY_WEBHOOK_SECRET,
      webhookAllowedIps: (process.env.CRAY_WEBHOOK_ALLOWED_IPS || '').split(','),
    }),
  ],
})
export class AppModule {}
```

### Injecting the Service Facade (`ICrayService`)

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { CRAY_SERVICE, ICrayService } from './modules/cray';

@Injectable()
export class WalletFundingService {
  constructor(
    @Inject(CRAY_SERVICE)
    private readonly crayService: ICrayService,
  ) {}

  async fundWallet(customerId: string, walletId: string, amount: string, reference: string) {
    return this.crayService.createFundingSession({
      customerId,
      walletId,
      amount,
      reference,
      method: 'transfer',
    });
  }
}
```

### Listening to Webhook Domain Events

The module cryptographically verifies webhook signatures and emits typed domain events via `EventEmitter2`:

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FundingConfirmedEvent, TransferCompletedEvent } from './modules/cray';

@Injectable()
export class WalletEventListener {
  @OnEvent('funding.confirmed')
  handleFundingConfirmed(event: FundingConfirmedEvent) {
    // Credit customer wallet with strict 2-decimal string NGN amount
    console.log(`Wallet ${event.walletId} credited: ${event.amount} ${event.currency}`);
  }

  @OnEvent('transfer.completed')
  handleTransferCompleted(event: TransferCompletedEvent) {
    console.log(`Transfer ${event.reference} completed: ${event.amount} NGN`);
  }
}
```

---

## 2. Key Validated Endpoints & Schemas Summary

### Environments & Base URLs
- **Staging / Sandbox:** `https://sandbox.crayfi.io`
- **Live / Production:** `https://pay.crayfi.io`

### Request Authentication & Signing (`X-Signature`)
- **Authentication:** `Authorization: Bearer <API_KEY>`
- **Signing Scheme:** ES256 (ECDSA P-256 / SHA-256)
- **Header:**
  ```text
  X-Signature: t=<unix-ms>,n=<uuid>,kid=<key-id>,v1=<base64-der-signature>
  ```
- **Canonical String (5 lines joined by `\n`):**
  ```text
  METHOD
  CANONICAL_PATH_WITH_QUERY
  TIMESTAMP_MS
  NONCE_UUID
  BODY_SHA256_HEX
  ```

### Virtual Accounts
- **Create Permanent / One-time Account:** `POST /virtual-accounts/create`
- **Wema OTP Confirmation:** `POST /api/virtual-accounts/generate-wallet`
- **List Virtual Accounts:** `GET /virtual-accounts`

### Payouts & Transfers
- **Get Banks:** `GET /payout/banks` (no query params for Nigeria).
- **Validate Beneficiary:** `POST /payout/accounts/validate`
- **Process Transfer:** `POST /payout/disburse`
- **Verify Payout Status:** `GET /payout/requery/{transaction_id}`

### Collections & Hosted Checkout
- **Initialize Hosted Checkout:** `POST /checkout/initialize`
- **Query Hosted Checkout:** `GET /checkout/query/{reference}`
- **General Transaction Query:** `GET /query/{reference}`
- **Card Charge:** `POST /charge`

### Webhooks
- **Endpoint:** `POST /cray/webhooks`
- **HMAC Signature (Collections):** `base64( HMAC-SHA256( JSON of "data" object, <webhookSecret> ) )`
- **Payin/Payout Events:** Protected via IP allowlist check + authoritative server-side requery.

### Balances & Reconciliation
- **Get Wallet Balance:** `GET /balance`
- **Reconciliation Sweep:** `POST /cray/reconciliation/run` (flags items stuck in PENDING > 30m)
