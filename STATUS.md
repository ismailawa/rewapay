# RewaPay × Cray Module Integration Status & Plan

**Document Version:** 1.0.0  
**Date:** 12 November 2026
**Module Type:** In-process NestJS Module (`@rewapay/cray` / `CrayModule`)  
**Target Environment:** NestJS 11, TypeScript 5.7, Node.js 22, PostgreSQL  
**Active Provider Contract:** Cray v1 (`docs/cray-api-v1-docs.md`)

The v1-only migration supersedes the historical v2 runtime contract below. The v2 entries remain as an implementation history; all active configuration, routes, authentication, signing canonicalization, webhook handling, and release checks now target v1.

---

## 1. Initial Plan Entry: Proposals for Open Decisions

As required by the *RewaPay x Cray Interface Contract (v0.1)*, this initial entry details the proposals for the 5 open design decisions prior to building out the provider-facing operations.

### Decision 1: Confirmation of Operation and Event Names
- **Service Operations (`ICrayService`):**
  - `createVirtualAccount(input)`: returns `{ accountNumber, accountName, bankName, bankCode?, status }` (or status: `"OTP_REQUIRED"`).
  - `getVirtualAccount(customerId)`: returns details or `null` (`NOT_FOUND`).
  - `createFundingSession(input)`: returns `{ sessionId, paymentUrl, expiresAt? }`.
  - `getFundingStatus(reference)`: returns `{ status, amount, confirmedAt? }`.
  - `listBanks()`: returns `[{ code, name }]`.
  - `validateBankAccount(input)`: returns `{ accountName, refId? }`.
  - `initiateTransfer(input)`: returns `{ transferId, status }`.
  - `getTransferStatus(reference)`: returns `{ status, amount, failureReason? }`.
  - `initiateRefund(input)`: returns `{ refundId, status }`.
  - `getRefundStatus(reference)`: returns `{ refundId, status, amount?, failureReason? }`.
  - `getPlatformBalance(currency?)`: returns `{ currency, available, ledger? }`.
- **Domain Events (`EventEmitter2`):**
  - `funding.confirmed` (`{ eventId, customerId, walletId, reference, amount, currency, confirmedAt }`)
  - `funding.failed` (`{ eventId, reference, reason, failedAt }`)
  - `transfer.completed` (`{ eventId, transferId, reference, amount, currency, completedAt }`)
  - `transfer.failed` (`{ eventId, transferId, reference, reason, failedAt }`)
  - `refund.completed` (`{ eventId, refundId, reference, amount, currency, completedAt }`)

### Decision 2: Provider Response Storage and Audit Retention
- **Storage Strategy:** Transaction state and verified webhook deliveries are persisted in dedicated PostgreSQL tables:
  - `cray_webhook_events`: captures a delivery fingerprint, signature, sanitized payload, verification status, and processing result.
  - `cray_transactions`: tracks state transitions, idempotency hashes, and sanitized provider responses.
- **Data Minimization & Redaction:** Sensitive KYC and payment fields (BVN, NIN, OTP, Card PAN, CVV) are never written to plain text columns or log outputs.
- **Retention Schedule:** Retention and archival remain the responsibility of the host platform; this module does not claim an internal purge/archive worker.

### Decision 3: Reconciliation Schedule & Stuck Items Surfacing
- **Reconciliation Cadence:**
  - **Every 5 minutes:** Requery eligible transactions older than 3 minutes via `GET /payout/requery/{transaction_id}` and hosted checkout query endpoints.
  - **Hourly:** Fetch and snapshot Cray platform balance via `GET /balance`.
- **Surfacing Stuck Items:**
  - Any transaction in `PENDING` or `PROCESSING` for > 30 minutes is automatically escalated to status `UNKNOWN` / `REQUIRES_MANUAL_REVIEW` in `cray_reconciliation_records`.
  - Emits an operational metric (`cray.reconciliation.stuck_items`) and alert for ops triage.

### Decision 4: Refund Scope for First Release
- **Decision:** **Implemented.**
- Full and partial refunds use `POST /refund/initiate`; status uses `GET /refund/query/{reference}`. Refunds use the collection-scoped Bearer key, optional request signing, persistence, and facade-level idempotency.

### Decision 5: Amount Representation (NGN Decimal String vs Minor Units)
- **Recommendation:** **Strict 2-decimal string NGN (e.g. `"100.00"`).**
- **Justification:**
  1. Conforms directly to the RewaPay Interface Contract Section 2 requirement: *"decimal string NGN, two decimal places, for example '100.00'. Never a float."*
  2. Cray API endpoints accept amounts in major units (Naira).
  3. Internally handled by `MoneyUtil` powered by `decimal.js` to ensure zero floating-point arithmetic errors.
  4. Stored in PostgreSQL as `NUMERIC(18, 2)`.

---

## 2. Implementation Task Plan & Testing Pace

The module is broken down into discrete, self-contained tasks. Each task is executed and verified independently.

| Task # | Task Description | Status | Test Pace & Deliverables |
| :--- | :--- | :--- | :--- |
| **Task 1** | **Setup & Scaffolding via NestJS CLI** | **COMPLETED** | - Project scaffolded with `@nestjs/cli`<br>- Core configs, enums, interfaces, utilities (`MoneyUtil`, `ReferenceUtil`)<br>- Unit tests passing (`money.util.spec.ts`, `reference.util.spec.ts`, `cray.module.spec.ts`) |
| **Task 2** | **Cray Client, Optional ES256 Request Signing & Error Mapping** | **REMEDIATED** | - Scoped Bearer Secret Keys on every request<br>- Optional ES256 signing controlled by configuration<br>- Signing key material required only when enabled<br>- Exact body-byte hashing, literal-plus query encoding, and fresh nonce/timestamp per signed retry |
| **Task 3** | **Customer & Virtual Accounts Management** | **REMEDIATED** | - Provider-specific Bloc/PalmPay permanent and one-time payloads<br>- Corporate account route<br>- Undocumented Wema HTTP path removed<br>- Encrypted account persistence |
| **Task 4** | **Bank Directory & Beneficiary Validation** | **REMEDIATED** | - Cached bank list (`GET /payout/banks`)<br>- Fresh validation immediately before every payout<br>- Encrypted account persistence with deterministic lookup hash and last-four display field |
| **Task 5** | **Payouts / Transfers Initiation & Requery** | **REMEDIATED** | - Payout dispatch (`POST /payout/disburse`)<br>- Provider transaction ID persisted separately and exclusively used for `/payout/requery/{transaction_id}`<br>- Database-atomic idempotency claim<br>- Failed/ambiguous executions are quarantined and never automatically replayed |
| **Task 6** | **Collections & Hosted Checkout** | **REMEDIATED** | - Hosted checkout initialization (`POST /checkout/initialize`) for card, transfer, and mobile money with real customer details<br>- Authoritative checkout query (`GET /checkout/query/{reference}`)<br>- General / VA collection query (`GET /query/{reference}`)<br>- TypeORM entity `CrayCheckout` (`cray_checkouts` table) |
| **Task 7** | **Webhook Processing & Cryptographic Verification** | **REMEDIATED** | - Base64 HMAC-SHA256 verification for every event<br>- Webhook-scope key rotation via `Cray-Webhook-Key`<br>- Exact-delivery fingerprint deduplication allows later state transitions<br>- Authoritative payin/payout requery as defense-in-depth<br>- Only terminal states emit domain events<br>- Redacted payload persistence |
| **Task 8** | **Idempotency & Database Persistence Layer** | **REMEDIATED** | - Database unique-constraint claim with canonical request hashing<br>- Completed response playback and payload mismatch rejection<br>- Concurrent callers cannot both execute<br>- Expired/retryable financial calls become `AMBIGUOUS` and require reconciliation; they are never automatically replayed |
| **Task 9** | **Reconciliation Engine & Balance Snapshots** | **REMEDIATED** | - Platform balance retrieval and hourly snapshots via `GET /balance`<br>- Five-minute reconciliation schedule<br>- Requery only with valid provider transaction IDs<br>- Missing/ambiguous provider IDs are escalated for manual review<br>- Operational HTTP controllers are not registered |
| **Task 10**| **Unified Service Facade (`ICrayService`) & Acceptance Suite** | **REMEDIATED** | - Unified in-process `CrayService` implementing all 11 current operations of `ICrayService`<br>- Refund status query included; Wema OTP facade removed<br>- Dual injection token support (`CrayService` and `CRAY_SERVICE`)<br>- Only the public webhook HTTP controller is registered |
| **Task 11** | **Cray v2 Contract & Security Remediation** | **COMPLETED** | - Separate scoped Bearer keys and configurable optional signing<br>- Provider-specific account contracts and real refunds<br>- Atomic/quarantined idempotency behavior<br>- HMAC verification for all webhook types with rotation and delivery fingerprints<br>- Correct provider-ID reconciliation and scheduled jobs<br>- Encrypted account storage, redacted webhook storage, module-safe runnable migration tooling, host `DataSource` registration, full database-backed module E2E coverage, aligned environment configuration, and Docker Compose PostgreSQL infrastructure |
| **Task 12** | **Cray v1-Only Contract Migration** | **COMPLETED** | - Single Bearer merchant API key (`CRAY_API_KEY`), corroborated against the official `crayfi` SDK<br>- Payment public/verification keys excluded because their endpoints are outside the implemented scope<br>- Explicit required (`CRAY_API_KEY`, `CRAY_DATA_ENCRYPTION_KEY`, `DATABASE_URL`) and conditional signing environment contract<br>- Host/live E2E coverage for staging configuration on the production gateway and conditional signing credentials<br>- Live Jest allowance aligned beyond the configured provider HTTP timeout<br>- Separately gated permanent Bloc virtual-account test through the real account implementation<br>- ConnectRamp v1 gateways and exact `/api` routes<br>- Full v1 signing canonicalization vectors<br>- Merchant-key HMAC for `collection.*` and authoritative requery for unsigned `payin`/`payout`<br>- Updated contract snapshot, runtime configuration, documentation, unit/acceptance/E2E/live suites |

**Current verification (13 November 2026):** 25 unit/acceptance suites (134 tests), a clean TypeScript build, 3 local E2E suites (14 passed; 3 opt-in provider checks skipped), the read-only live suite (6 passed; the virtual-account mutation skipped), and the implementation-to-Cray virtual-account suite (5 passed; 2 unrelated live checks skipped) pass. Coverage includes all 11 facade operations, exact v1 provider routes, single-key authentication, required and conditional environment validation, immutable production-gateway live-test guarding with staging configuration, permanent Bloc creation through `AccountsService`, official signing canonicalization vectors, provider-specific accounts, hosted checkout/direct card helpers, payout/refund lifecycles, encrypted persistence, balance snapshots, reconciliation, signed `collection.*` webhooks, and authoritative verification of unsigned `payin`/`payout` events. Per Cray's direction, the opt-in live suites keep `CRAY_ENVIRONMENT=staging` and call the v1 ConnectRamp production gateway. Balance, bank-directory, and permanent Bloc creation now pass with the configured staging merchant API key on that URL. The mutation suite exercised validation, payload mapping, provider I/O, response normalization, encryption, persistence, and retrieval through the real account implementation. It is not executed by the normal live command; `npm run test:e2e:live:virtual-account` creates a permanent account with a fresh reference. Signing credentials are additionally needed only when enabled for that merchant.

---

## 3. Testing Pace & Strategy

To ensure high financial precision and reliability, testing progresses at a defined pace across three tiers:

1. **Unit Tests (Per Task):**
   - Every utility, mapper, cryptographic signer, and service method includes isolated unit tests.
   - Enforce 100% test pass rate before marking any task as complete.
2. **Contract & Mock Provider Verification:**
   - Provider HTTP calls are tested against simulated Cray API responses and error shapes using test vectors.
   - Edge cases tested: network timeouts, HTTP 409 conflict on reused references, invalid HMACs, malformed numbers.
3. **End-to-End In-Process Module Tests:**
   - The consuming RewaPay wallet module interactions (`ICrayService` calls and `EventEmitter2` listeners) are tested end-to-end using NestJS testing modules with an in-memory/test database.
