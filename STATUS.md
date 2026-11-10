# RewaPay × Cray Module Integration Status & Plan

**Document Version:** 1.0.0  
**Date:** 10 November 2026  
**Module Type:** In-process NestJS Module (`@rewapay/cray` / `CrayModule`)  
**Target Environment:** NestJS 11, TypeScript 5.7, Node.js 22, PostgreSQL  

---

## 1. Initial Plan Entry: Proposals for Open Decisions

As required by the *RewaPay x Cray Interface Contract (v0.1)*, this initial entry details the proposals for the 5 open design decisions prior to building out the provider-facing operations.

### Decision 1: Confirmation of Operation and Event Names
- **Service Operations (`ICrayService`):**
  - `createVirtualAccount(input)`: returns `{ accountNumber, accountName, bankName, bankCode?, status }` (or status: `"OTP_REQUIRED"`).
  - `submitVirtualAccountOtp(input)`: returns `{ status }`.
  - `getVirtualAccount(customerId)`: returns details or `null` (`NOT_FOUND`).
  - `createFundingSession(input)`: returns `{ sessionId, paymentUrl, expiresAt }`.
  - `getFundingStatus(reference)`: returns `{ status, amount, confirmedAt? }`.
  - `listBanks()`: returns `[{ code, name }]`.
  - `validateBankAccount(input)`: returns `{ accountName, refId? }`.
  - `initiateTransfer(input)`: returns `{ transferId, status }`.
  - `getTransferStatus(reference)`: returns `{ status, amount, failureReason? }`.
  - `initiateRefund(input)`: returns `{ refundId, status }`.
  - `getPlatformBalance(currency?)`: returns `{ currency, available, ledger? }`.
- **Domain Events (`EventEmitter2`):**
  - `funding.confirmed` (`{ eventId, customerId, walletId, reference, amount, currency, confirmedAt }`)
  - `funding.failed` (`{ eventId, reference, reason, failedAt }`)
  - `transfer.completed` (`{ eventId, transferId, reference, amount, currency, completedAt }`)
  - `transfer.failed` (`{ eventId, transferId, reference, reason, failedAt }`)
  - `refund.completed` (`{ eventId, refundId, reference, amount, currency, completedAt }`)

### Decision 2: Provider Response Storage and Audit Retention
- **Storage Strategy:** All provider interactions, webhook deliveries, and queries are persisted in dedicated PostgreSQL tables:
  - `cray_webhook_events`: captures raw event headers, sanitized payload, verification status, and processing logs.
  - `cray_transactions`: tracks state transitions, idempotency hashes, and sanitized provider responses.
- **Data Minimization & Redaction:** Sensitive KYC and payment fields (BVN, NIN, OTP, Card PAN, CVV) are never written to plain text columns or log outputs.
- **Retention Schedule:**
  - Active transactional and webhook records: retained for 12 months for active reconciliation and dispute lookups.
  - Audit archive: retained for 7 years in partitioned PostgreSQL cold storage to satisfy financial audit and regulatory requirements.

### Decision 3: Reconciliation Schedule & Stuck Items Surfacing
- **Reconciliation Cadence:**
  - **Every 5 minutes:** Requery all transactions in `PENDING` or `PROCESSING` state older than 3 minutes via `GET /payout/requery/{transaction_id}` and `GET /api/query/{customer_reference}`.
  - **Every 2 minutes:** Retry transiently failed webhook jobs with exponential backoff.
  - **Hourly:** Fetch and snapshot Cray platform balance via `GET /api/balance?currency=NGN`.
  - **Daily (01:00 UTC):** Comprehensive ledger-to-provider reconciliation report.
- **Surfacing Stuck Items:**
  - Any transaction in `PENDING` or `PROCESSING` for > 30 minutes is automatically escalated to status `UNKNOWN` / `REQUIRES_MANUAL_REVIEW` in `cray_reconciliation_records`.
  - Emits an operational metric (`cray.reconciliation.stuck_items`) and alert for ops triage.

### Decision 4: Refund Scope for First Release
- **Recommendation:** **Deferred to Phase 2 (post-MVP).**
- **Justification:** Cray's API currently documents `POST /api/v2/refund/initiate` without complete request/response schemas, settlement timing, or dispute lifecycle. The module includes the `initiateRefund` interface method and database schema, but keeps the execution gated by `CRAY_ENABLE_REFUNDS=false` until Cray finalizes sandbox contracts.

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
| **Task 2** | **Cray Client, ES256 Request Signing & Error Mapping** | **COMPLETED** | - Typed HTTP client (`CrayApiClient`) with rate-limiting (60 RPM general, 30 RPM financial)<br>- ES256 request signing using P-256/SHA-256 with DER Base64 formatting (`CraySigner`)<br>- Canonical message test vectors & error normalization (`CrayErrorMapper`)<br>- 34/34 tests passing across 8 suites |
| **Task 3** | **Customer & Virtual Accounts Management** | **COMPLETED** | - Permanent NGN virtual accounts (`POST /virtual-accounts/create`) validated with `docs.crayfi.com/v2`<br>- Wema Bank OTP submission (`POST /api/virtual-accounts/generate-wallet`)<br>- Account retrieval and TypeORM entities (`CrayCustomer`, `CrayVirtualAccount`)<br>- Masked BVN/NIN/OTP sensitive data handling<br>- 45/45 tests passing across 10 suites |
| **Task 4** | **Bank Directory & Beneficiary Validation** | **COMPLETED** | - Cached bank list (`GET /payout/banks`) with TTL caching<br>- Account name validation (`POST /payout/accounts/validate` returning `ref_id` / `account_name`)<br>- Beneficiary persistence model (`CrayBeneficiary`)<br>- Validated against official Cray v2 documentation (`docs.crayfi.com/v2`)<br>- 54/54 tests passing across 12 suites |
| **Task 5** | **Payouts / Transfers Initiation & Requery** | **COMPLETED** | - Payout dispatch (`POST /payout/disburse`) validated against `docs.crayfi.com/v2`<br>- Status requery (`GET /payout/requery/{transaction_id}`)<br>- In-memory idempotency map + DB fallback with `@Optional()` repo injection<br>- Critical Timeout Rule: retryable errors keep status `PENDING`, never `FAILED`<br>- Sensitive data masked (account `***1234` in logs, no plaintext storage)<br>- `CrayTransfer` TypeORM entity (`cray_transfers` table)<br>- 65/65 tests passing across 14 suites, zero build errors |
| **Task 6** | **Collections & Hosted Checkout** | **COMPLETED** | - Hosted checkout initialization (`POST /checkout/initialize`)<br>- Authoritative checkout query (`GET /checkout/query/{reference}`)<br>- General / VA collection query (`GET /query/{reference}`)<br>- Gated direct card charge (`POST /charge`)<br>- TypeORM entity `CrayCheckout` (`cray_checkouts` table)<br>- 100% unit tests passing (`checkout.service.spec.ts`, `checkout.controller.spec.ts`) |
| **Task 7** | **Webhook Processing & Cryptographic Verification** | **COMPLETED** | - Base64 HMAC-SHA256 signature verification over `data` for collection webhooks (`WebhooksVerifier`)<br>- IP allowlist check & authoritative requery (`/payout/requery`, `/query`) for payin/payout webhooks<br>- Replay defense / idempotency prevents double domain event emission<br>- Domain event emission (`funding.confirmed`, `funding.failed`, `transfer.completed`, `transfer.failed`) via `EventEmitter2`<br>- TypeORM entity `CrayWebhookEvent` (`cray_webhook_events` table) with raw payload & verification audit<br>- Sensitive account numbers masked in logs (`***1234`)<br>- Unit tests passing across verifier, service, controller, and module suites |
| **Task 8** | **Idempotency & Database Persistence Layer** | **COMPLETED** | - TypeORM entity `CrayIdempotencyRecord` (`cray_idempotency` table) with request hash matching & lock tracking<br>- TypeORM entity `CrayTransactionRecord` (`cray_transactions` table) for central transactional audit ledger<br>- `IdempotencyService` with recursive canonical SHA-256 payload hashing<br>- Atomic concurrency lock with expiration takeover preventing race conditions<br>- Payload mismatch detection throwing `INVALID_INPUT`<br>- Cached response playback for repeated executions<br>- 100% unit tests passing (`idempotency.service.spec.ts`) |
| **Task 9** | **Reconciliation Engine & Balance Snapshots** | **COMPLETED** | - Platform balance retrieval & 2-decimal formatting via `GET /balance` (`ReconciliationService`)<br>- Periodic requery engine for pending transfers and checkouts older than 3 minutes<br>- Automated detection & flagging of transactions stuck in PENDING > 30 minutes with operational alerts<br>- TypeORM entity `CrayBalanceSnapshot` (`cray_balance_snapshots` table) for hourly balance audit snapshots<br>- TypeORM entity `CrayReconciliationRecord` (`cray_reconciliation_records` table) for discrepancy & resolution tracking<br>- REST controller `GET /cray/balance`, `POST /cray/balance/snapshot`, `POST /cray/reconciliation/run`<br>- 100% unit tests passing (`reconciliation.service.spec.ts`, `reconciliation.controller.spec.ts`) |
| **Task 10**| **Unified Service Facade (`ICrayService`) & Acceptance Suite** | Pending | - In-process service facade exporting full `ICrayService`<br>- End-to-end sandbox mock integration suite simulating full payment lifecycles |

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

