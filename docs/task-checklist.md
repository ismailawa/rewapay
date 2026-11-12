# RewaPay × Cray Module: Task Checklist & Acceptance Criteria

**Document Reference:** `docs/task-checklist.md`  
**API Specification Source:** [`docs/cray-api-v2-docs.md`](file:///Users/ismailawa/Documents/Projects/rewapay-cray/docs/cray-api-v2-docs.md)  
**Task Roadmap Source:** [`STATUS.md`](file:///Users/ismailawa/Documents/Projects/rewapay-cray/STATUS.md)  

---

## Implementation Policy & Mandatory Rules

1. **API Contract Verification:** Before implementing or modifying any Cray-facing integration code, consult and verify exact endpoint paths, payloads, and response shapes in `docs/cray-api-v2-docs.md`.
2. **Task Progress & Idempotency:** Consult `STATUS.md` before starting each task, complete tasks one by one with 100% test pass rate, and update `STATUS.md` and this checklist after each task is completed.
3. **Financial Safety & Idempotency:** Every financial operation (`disburse`, `checkout`, `collection`, `refund`) must enforce idempotency keys, safe timeout handling (requery before retry), and zero floating-point arithmetic.
4. **Sensitive Data Protection:** BVN, NIN, OTP, and raw card details must never be logged or stored in plain text. Account numbers must be masked in logs (`***1234`).

---

## Master Task Checklist

- [x] **Task 1: Project Setup & Scaffolding via NestJS CLI**
  - **Scope:** Initialize project structure, core configuration, typed interfaces, and zero-float money utilities.
  - **Endpoints:** N/A (Foundational infrastructure).
  - **Acceptance Criteria:**
    - [x] Strict TypeScript NestJS project scaffolded with `@nestjs/cli`.
    - [x] `CrayModule` generated with static and dynamic registration (`forRoot`).
    - [x] `ICrayService`, DTOs, and event payloads defined matching Interface Contract v0.1.
    - [x] `MoneyUtil` implemented with `decimal.js` for strict 2-decimal NGN string handling.
    - [x] `ReferenceUtil` implemented for <= 64 char unique reference generation.
    - [x] Baseline unit tests passing.

- [x] **Task 2: Cray API Client, ES256 Request Signing & Error Mapping**
  - **Scope:** Typed Axios client, rate limiting, ES256 P-256 signing, and error mapping.
  - **Endpoints:** Global HTTP transport.
  - **Acceptance Criteria:**
    - [x] `CraySigner` builds canonical 5-line string (`METHOD\nPATH\nTIMESTAMP\nNONCE\nHASH`).
    - [x] Optionally signs using ES256 (ECDSA P-256 / SHA-256) with DER Base64 output.
    - [x] Formats `X-Signature: t=<ms>,n=<uuid>,kid=<keyId>,v1=<sig>` per `docs.crayfi.com/v2`.
    - [x] `CrayRateLimiter` enforces 60 RPM for general endpoints and 30 RPM for financial endpoints.
    - [x] `CrayErrorMapper` maps HTTP 400/404/409/422/429/5xx into typed `CrayException`.
    - [x] Safe GET retries on transient errors; zero blind retries on financial disbursements.

- [x] **Task 3: Customer & Virtual Accounts Management**
  - **Scope:** Create Bloc/PalmPay permanent and one-time NGN virtual accounts, corporate accounts, and retrieve persisted accounts.
  - **Endpoints:** `POST /virtual-accounts/create`, `POST /corporate-accounts/create`, `GET /virtual-accounts`.
  - **Acceptance Criteria:**
    - [x] `POST /virtual-accounts/create` handles default provider `Bloc` and `PalmPay`.
    - [x] Provider-discriminated payloads prevent Bloc, PalmPay, and corporate fields from being mixed.
    - [x] Corporate accounts use `POST /corporate-accounts/create`.
    - [x] The undocumented direct Wema OTP HTTP operation is not exposed by the facade.
    - [x] Duplicate creation prevented if active account already exists for customer.
    - [x] `getVirtualAccount` returns sanitized account details or null.
    - [x] BVN/NIN are validated and masked in logs and audits.
    - [x] Account numbers are encrypted at rest with a separate last-four display field.

- [x] **Task 4: Bank Directory & Beneficiary Validation**
  - **Scope:** Fetch supported banks with caching, validate account names, and record beneficiaries.
  - **Endpoints:** `GET /payout/banks`, `POST /payout/accounts/validate`.
  - **Acceptance Criteria:**
    - [x] `GET /payout/banks` normalizes institution codes and bank names.
    - [x] 24-hour in-memory TTL cache prevents hitting rate limits.
    - [x] `POST /payout/accounts/validate` submits 10-digit account number and bank code (no countryCode for NG).
    - [x] Captures verified `account_name` and validation session ID `ref_id`.
    - [x] Persists `CrayBeneficiary` with `ref_id` required for disbursements.
    - [x] Bank directory and validation are exposed through the authenticated in-process facade; operational controllers are not registered.

- [x] **Task 5: Payouts / Transfers Initiation & Requery**
  - **Scope:** NGN payout disburse, status tracking, timeout safety, and failure recovery.
  - **Endpoints:** `POST /payout/disburse`, `GET /payout/requery/{transaction_id}`.
  - **Acceptance Criteria:**
    - [x] `POST /payout/disburse` sends `customer_reference`, `amount`, `account_number`, `bank_code`, `recipient_name`, `ref_id`, and `currency: "NGN"`.
    - [x] Idempotent reuse: repeated call with same reference returns original result without re-debiting.
    - [x] Always performs a fresh beneficiary validation immediately before disbursement and uses its `ref_id`.
    - [x] Critical timeout rule: ambiguous timeout preserves transaction in `PENDING` state; never marks failed or retries blindly.
    - [x] `getTransferStatus` requeries `GET /payout/requery/{transaction_id}` and maps `approved` -> `SUCCESSFUL`, `failed` -> `FAILED`.
    - [x] TypeORM entity `CrayTransfer` persists the provider transaction ID separately from the merchant reference.

- [x] **Task 6: Collections & Hosted Checkout**
  - **Scope:** Hosted checkout initialization, status query, and virtual account collection requery.
  - **Endpoints:** `POST /checkout/initialize`, `GET /checkout/query/{reference}`, `GET /query/{customer_reference}`.
  - **Acceptance Criteria:**
    - [x] Hosted checkout initializes session and returns payment link `data.link`.
    - [x] Checkout verification queries authoritative status via `GET /checkout/query/{reference}`.
    - [x] Virtual account funding verified via `GET /query/{customer_reference}`.
    - [x] Hosted checkout supports card, transfer, and mobile money without synthesizing customer PII.
    - [x] 100% unit tests passing.

- [x] **Task 7: Webhook Processing & Cryptographic Verification**
  - **Scope:** Receive webhooks, verify signatures, persist events, and emit internal domain events.
  - **Endpoints:** `POST /cray/webhooks`.
  - **Acceptance Criteria:**
    - [x] Every event verified using Base64 HMAC-SHA256 (`hash` over `JSON_string(data)`).
    - [x] Rotating webhook-scope keys selected through the `Cray-Webhook-Key` hint.
    - [x] Payin/payout events additionally verified through server-side transaction requery.
    - [x] Emits domain events (`funding.confirmed`, `transfer.completed`, etc.) via `EventEmitter2`.
    - [x] Persists redacted events in `cray_webhook_events` with exact-delivery fingerprinting.
    - [x] 100% unit tests passing.

- [x] **Task 8: Idempotency & Database Persistence Layer**
  - **Scope:** Enforce database-level idempotency locks and request payload hash matching.
  - **Acceptance Criteria:**
    - [x] `cray_idempotency` entity with unique key and request payload hash.
    - [x] Reusing key with different payload throws `INVALID_INPUT` / `DUPLICATE_REFERENCE`.
    - [x] Concurrency-safe atomic transaction handling.
    - [x] 100% unit tests passing.

- [x] **Task 9: Reconciliation Engine & Platform Balance**
  - **Scope:** Scheduled workers to reconcile pending transactions and record platform balances.
  - **Endpoints:** `GET /balance`.
  - **Acceptance Criteria:**
    - [x] Periodic requery of pending transfers and funding transactions.
    - [x] Hourly snapshot of Cray wallet balances (`GET /balance`).
    - [x] Flags transactions stuck > 30 minutes for operations review.
    - [x] 100% unit tests passing.

- [x] **Task 10: Unified Wallet Service Facade (`ICrayService`) & Acceptance Suite**
  - **Scope:** In-process facade service implementing `ICrayService` and mock/database-backed verification.
  - **Acceptance Criteria:**
    - [x] `CrayService` exports clean in-process API matching Interface Contract v0.1.
    - [x] Acceptance tests simulate payment lifecycles and E2E tests construct real TypeORM repositories.
    - [x] Documentation and module export verification for RewaPay backend.

- [x] **Task 11: Cray v2 Contract & Security Remediation**
  - [x] Separate collection/disbursement keys and route them by documented scope.
  - [x] Support optional ES256 signing and correct literal-plus query canonicalization.
  - [x] Use provider-specific Bloc, PalmPay, one-time, and corporate account payloads.
  - [x] Require real checkout customer details and support card, transfer, and mobile money.
  - [x] Implement full/partial refund initiation and refund status query.
  - [x] Obtain a fresh payout `ref_id` and requery only with Cray's transaction ID.
  - [x] Quarantine ambiguous idempotency records instead of replaying them.
  - [x] Verify every webhook HMAC, support key rotation, and fingerprint exact deliveries.
  - [x] Encrypt account numbers and persist only redacted webhook payloads.
  - [x] Run scheduled reconciliation/balance snapshots and provide a security backfill migration.
  - [x] Align `.env.example` with scoped Bearer keys, optional signing, rotating webhook keys, encryption, and `DATABASE_URL`.
  - [x] Provide Docker Compose PostgreSQL infrastructure with readiness checks, persistent storage, and required UUID extension initialization.
  - [x] Pass unit, build, and database-backed E2E verification.
  - [ ] Run the opt-in live sandbox contract suite with externally supplied scoped credentials, webhook keys, and signing credentials when enabled.
