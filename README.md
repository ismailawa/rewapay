# @rewapay/cray Integration Module

A NestJS dynamic module wrapping the **Cray Finance v2 API** for seamless integration into RewaPay backend services.

---

## 📦 Installation

```bash
npm install @rewapay/cray @nestjs/config @nestjs/event-emitter @nestjs/typeorm
```

The module depends on the following Nest packages, which are added as peer dependencies:
- `@nestjs/config`
- `@nestjs/event-emitter`
- `@nestjs/typeorm`
- `pg` (PostgreSQL driver)

## ⚙️ Configuration

Cray provides **three separate key types** (all from **Dashboard → Settings → Developer**). Copy `.env.example` and fill in your keys:

```dotenv
CRAY_ENVIRONMENT=staging               # staging | production | test
CRAY_BASE_URL=https://sandbox.crayfi.io

# 1. Scoped merchant API key → Authorization: Bearer <key>
#    Covers: virtual accounts, payouts, disburse, balance, hosted checkout
CRAYFI_MERCHANT_KEY_TEST=your_merchant_api_key

# 2. Public key (lrp_...) → sent in request BODY for payment-init endpoints
#    Covers: /payments/initialize, /payment/create, /payment/merchant/create
CRAYFI_PUBLIC_KEY_TEST=lrp_your_public_key

# 3. Secret key (lrs_...) → sent in URL PATH for payment-verify endpoint only
#    GET /payment/merchant/verify/{referenceCode}/{secretKey}
#    ⚠️  Never expose in browser code, logs, or client-side requests
CRAYFI_SECRET_KEY_TEST=lrs_your_secret_key

# Webhook key (separate scope, cannot call the API)
CRAY_WEBHOOK_SECRET=your_webhook_scoped_api_key
CRAY_WEBHOOK_ALLOWED_IPS=127.0.0.1,::1

# Request signing — only set to true if enabled in your Cray Dashboard
CRAY_REQUEST_SIGNING_ENABLED=false
```

> **How the three keys map to Cray's auth docs:**
>
> | Key | Auth mechanism | Endpoints |
> |---|---|---|
> | `CRAYFI_MERCHANT_KEY_TEST` | `Authorization: Bearer <key>` header | All main API endpoints |
> | `CRAYFI_PUBLIC_KEY_TEST` | `public_key` field in request **body** | Payment Initialization endpoints |
> | `CRAYFI_SECRET_KEY_TEST` | `{secretKey}` in URL **path** | `GET /payment/merchant/verify/{ref}/{key}` only |

## 📚 Usage Guide

### Register the module in `AppModule`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CrayModule } from './modules/cray/cray.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CrayModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        environment: config.get<'staging' | 'production' | 'test'>('CRAY_ENVIRONMENT', 'staging'),
        // Scoped merchant key — Bearer token for main API endpoints
        apiToken: config.get<string>('CRAYFI_MERCHANT_KEY_TEST'),
        // Payment Initialization inline credentials
        publicKey: config.get<string>('CRAYFI_PUBLIC_KEY_TEST'),
        secretKey: config.get<string>('CRAYFI_SECRET_KEY_TEST'),
        // Request signing — only needed if enabled in Cray Dashboard
        requestSigningEnabled: config.get('CRAY_REQUEST_SIGNING_ENABLED') === 'true',
        signingKeyId: config.get<string>('CRAY_SIGNING_KEY_ID'),
        signingPrivateKey: config.get<string>('CRAY_SIGNING_PRIVATE_KEY'),
        webhookSecret: config.get<string>('CRAY_WEBHOOK_SECRET'),
        webhookAllowedIps: config
          .get<string>('CRAY_WEBHOOK_ALLOWED_IPS', '')
          .split(',')
          .filter(Boolean),
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

### Inject the service facade

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { CRAY_SERVICE, ICrayService } from './modules/cray';

@Injectable()
export class WalletFundingService {
  constructor(@Inject(CRAY_SERVICE) private readonly cray: ICrayService) {}

  async fundWallet(customerId: string, walletId: string, amount: string) {
    return this.cray.createFundingSession({
      customerId,
      walletId,
      amount,
      reference: `fund-${Date.now()}`,
      method: 'transfer',
    });
  }
}
```

### Listening to domain events

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FundingConfirmedEvent, TransferCompletedEvent } from './modules/cray';

@Injectable()
export class WalletEventListener {
  @OnEvent('funding.confirmed')
  handleFunding(event: FundingConfirmedEvent) {
    console.log('Funding confirmed', event);
  }

  @OnEvent('transfer.completed')
  handleTransfer(event: TransferCompletedEvent) {
    console.log('Transfer completed', event);
  }
}
```

## 🗂️ Documentation

- **API reference**: `docs/cray-api-v2-docs.md`
- **Task checklist & acceptance criteria**: `docs/task-checklist.md`
- **Project status & roadmap**: `STATUS.md`

## 🧪 Testing

```bash
npm run test              # unit tests
npm run test:e2e          # end‑to‑end acceptance suite
npm run test:cov          # coverage report
```

All tests must pass (`npm run build` should also compile without errors) before merging.

---

Built with ❤️ by the RewaPay team.
