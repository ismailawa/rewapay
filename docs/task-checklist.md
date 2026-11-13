# RewaPay × Cray Module: Task Checklist & Acceptance Criteria

**Document Reference:** `docs/task-checklist.md`  
**API Specification Source:** [`docs/cray-api-v1-docs.md`](file:///Users/ismailawa/Documents/Projects/rewapay-cray/docs/cray-api-v1-docs.md)
**Task Roadmap Source:** [`STATUS.md`](file:///Users/ismailawa/Documents/Projects/rewapay-cray/STATUS.md)  

---

## Implementation Policy & Mandatory Rules

1. **API Contract Verification:** Before implementing or modifying any Cray-facing integration code, consult and verify exact endpoint paths, payloads, and response shapes in `docs/cray-api-v1-docs.md`.
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
    - [x] Formats `X-Signature: t=<ms>,n=<uuid>,kid=<keyId>,v1=<sig>` per `docs.crayfi.com/v1`.
    - [x] `CrayRateLimiter` enforces 60 RPM for general endpoints and 30 RPM for financial endpoints.
    - [x] `CrayErrorMapper` maps HTTP 400/404/409/422/429/5xx into typed `CrayException`.
    - [x] Safe GET retries on transient errors; zero blind retries on financial disbursements.

- [x] **Task 3: Customer & Virtual Accounts Management**
  - **Scope:** Create Bloc/PalmPay permanent and one-time NGN virtual accounts, corporate accounts, and retrieve persisted accounts.
  - **Endpoints:** `POST /api/virtual-accounts/create`, `POST /api/corporate-accounts/create`, `GET /api/virtual-accounts`.
  - **Acceptance Criteria:**
    - [x] `POST /api/virtual-accounts/create` handles default provider `Bloc` and `PalmPay`.
    - [x] Provider-discriminated payloads prevent Bloc, PalmPay, and corporate fields from being mixed.
    - [x] Corporate accounts use `POST /api/corporate-accounts/create`.
    - [x] The undocumented direct Wema OTP HTTP operation is not exposed by the facade.
    - [x] Duplicate creation prevented if active account already exists for customer.
    - [x] `getVirtualAccount` returns sanitized account details or null.
    - [x] BVN/NIN are validated and masked in logs and audits.
    - [x] Account numbers are encrypted at rest with a separate last-four display field.

- [x] **Task 4: Bank Directory & Beneficiary Validation**
  - **Scope:** Fetch supported banks with caching, validate account names, and record beneficiaries.
  - **Endpoints:** `GET /api/payout/banks`, `POST /api/payout/accounts/validate`.
  - **Acceptance Criteria:**
    - [x] `GET /api/payout/banks` normalizes institution codes and bank names.
    - [x] 24-hour in-memory TTL cache prevents hitting rate limits.
    - [x] `POST /api/payout/accounts/validate` submits 10-digit account number and bank code (no countryCode for NG).
    - [x] Captures verified `account_name` and validation session ID `ref_id`.
    - [x] Persists `CrayBeneficiary` with `ref_id` required for disbursements.
    - [x] Bank directory and validation are exposed through the authenticated in-process facade; operational controllers are not registered.

- [x] **Task 5: Payouts / Transfers Initiation & Requery**
  - **Scope:** NGN payout disburse, status tracking, timeout safety, and failure recovery.
  - **Endpoints:** `POST /api/payout/disburse`, `GET /api/payout/requery/{transaction_id}`.
  - **Acceptance Criteria:**
    - [x] `POST /api/payout/disburse` sends `customer_reference`, `amount`, `account_number`, `bank_code`, `recipient_name`, `ref_id`, and `currency: "NGN"`.
    - [x] Idempotent reuse: repeated call with same reference returns original result without re-debiting.
    - [x] Always performs a fresh beneficiary validation immediately before disbursement and uses its `ref_id`.
    - [x] Critical timeout rule: ambiguous timeout preserves transaction in `PENDING` state; never marks failed or retries blindly.
    - [x] `getTransferStatus` requeries `GET /api/payout/requery/{transaction_id}` and maps `approved` -> `SUCCESSFUL`, `failed` -> `FAILED`.
    - [x] TypeORM entity `CrayTransfer` persists the provider transaction ID separately from the merchant reference.

- [x] **Task 6: Collections & Hosted Checkout**
  - **Scope:** Hosted checkout initialization, status query, and virtual account collection requery.
  - **Endpoints:** `POST /api/checkout/initialize`, `GET /api/checkout/query/{reference}`, `GET /api/query/{customer_reference}`.
  - **Acceptance Criteria:**
    - [x] Hosted checkout initializes session and returns payment link `data.link`.
    - [x] Checkout verification queries authoritative status via `GET /api/checkout/query/{reference}`.
    - [x] Virtual account funding verified via `GET /api/query/{customer_reference}`.
    - [x] Hosted checkout supports card, transfer, and mobile money without synthesizing customer PII.
    - [x] 100% unit tests passing.

- [x] **Task 7: Webhook Processing & Cryptographic Verification**
  - **Scope:** Receive webhooks, verify signatures, persist events, and emit internal domain events.
  - **Endpoints:** Host-selected `POST` route through `CrayWebhooksControllerBase`; no route is mounted by `CrayModule`.
  - **Acceptance Criteria:**
    - [x] `collection.*` events verified using Base64 HMAC-SHA256 (`hash` over `JSON_string(data)`) and the v1 merchant API key.
    - [x] Unsigned v1 `payin` and `payout` events verified through authoritative server-side transaction requery before event emission.
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
  - **Endpoints:** `GET /api/balance`.
  - **Acceptance Criteria:**
    - [x] Periodic requery of pending transfers and funding transactions.
    - [x] Hourly snapshot of Cray wallet balances (`GET /api/balance`).
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
  - [x] Verify TypeORM migration show/run/revert scripts pass the data-source argument and load the standalone data source correctly.
  - [x] Register the host application's TypeORM `DataSource` from `DATABASE_URL` before constructing Cray repositories.
  - [x] E2E-import the real host `AppModule` and prove its `DataSource` and Cray repositories construct together.
  - [x] Exercise the entire Cray module through database-backed E2E tests: all 11 facade operations, provider-specific accounts, all hosted checkout methods, payout/refund lifecycles, direct collection helpers, balance snapshots, reconciliation, encrypted persistence, and signed webhook transitions/deduplication.
  - [x] Provide an opt-in, production-guarded live suite for read-only Cray sandbox authentication checks through both scoped keys.
  - [x] Pass unit, build, and database-backed E2E verification.
  - [ ] Pass the opt-in live sandbox contract suite with valid scoped credentials (12 November 2026 attempt reached Cray but both configured non-`lrs_` keys were rejected as invalid).

- [x] **Task 12: Cray v1-Only Contract Migration**
  - [x] Replace scoped collection/disbursement/webhook keys with one `apiKey` / `CRAY_API_KEY` breaking contract.
  - [x] Use the ConnectRamp v1 staging and production gateways and exact `/api` endpoint prefixes.
  - [x] Remove stale `/api/v2` segments from corporate-account, direct-card-charge, and refund operations; all active v1 routes use `/api/...`.
  - [x] Implement v1 query canonicalization, including plus-to-space, scalar last-value, and indexed-array rules.
  - [x] Verify `collection.*` HMACs with the merchant API key and confirm unsigned `payin`/`payout` events by requery.
  - [x] Keep `ICrayService`, persistence, financial idempotency, ambiguous-timeout quarantine, encryption, and redaction behavior intact.
  - [x] Update unit, acceptance, E2E, live-contract, README, status, and workflow documentation; identify required, conditional, and defaulted v1 variables in `.env.example`.
  - [x] Keep host and live E2E configuration aligned with required variables, conditional signing, staging credentials, and an immutable production-gateway override per Cray's direction.
  - [x] Add a separately gated live contract test for permanent Bloc virtual-account creation using staging configuration, the production gateway, the documented payload, and a fresh reference per run.
  - [x] Exercise permanent Bloc creation through `AccountsService` to cover implementation mapping, provider I/O, normalization, encryption, and persistence lookup end to end.
  - [x] Pass the opt-in implementation-to-Cray virtual-account test using staging configuration on the production gateway.
  - [x] Allow live provider checks to reach the configured HTTP timeout before Jest aborts them.
  - [x] Pass unit, build, and database-backed E2E verification.
  - [x] Verify against the official `crayfi` SDK that implemented v1 routes use one Bearer merchant API key and do not require payment public/verification keys.
  - [x] Pass the complete read-only opt-in v1 contract suite using staging configuration on the production gateway; balance and bank-directory checks succeed.

- [x] **Task 13: Full Cray v1 Module Audit**
  - [x] Inventory every implemented route, authentication header, payload, response mapping, webhook path, reconciliation query, and live-contract fixture against `docs/cray-api-v1-docs.md`.
  - [x] Requery payouts exclusively with Cray's provider transaction ID and URL-encode every dynamic provider path segment.
  - [x] Enforce strict decimal-string checkout amounts and normalize persisted numeric values before returning facade results.
  - [x] Serialize query arrays with explicit v1 indexes while preserving raw-plus, literal-plus, duplicate-scalar, sorting, and exact-body signing rules.
  - [x] Require authoritative unsigned-webhook identity, status class, amount, and currency agreement before verification or terminal event emission.
  - [x] Remove the obsolete webhook key hint from the public webhook DTO and retain exact-delivery deduplication and redaction.
  - [x] Align active documentation and fixtures to the exact v1 routes while preserving historical v2 status and the migration filename/class.
  - [x] Pass all unit/acceptance tests, the TypeScript build, database-backed E2E tests, and the read-only live Cray contract suite.

- [x] **Task 14: Remove Remaining Active v2 Route Segments**
  - [x] Update corporate account creation to `POST /api/corporate-accounts/create`.
  - [x] Update direct card charge to `POST /api/charge`.
  - [x] Update refunds to `POST /api/refund/initiate` and `GET /api/refund/query/{reference}`.
  - [x] Remove `/api/v2` from all active implementation code, tests, fixtures, comments, and v1 documentation.
  - [x] Retain the historical Task 11 record and applied TypeORM migration filename/class to preserve implementation and migration history.

- [x] **Task 15: Secure Host Integration & Opt-In Controllers**
  - [x] Make `CrayModule`, `forRoot`, and `forRootAsync` service-only with zero registered HTTP controllers.
  - [x] Export unmounted account, bank, checkout, transfer, refund, admin, and webhook controller bases.
  - [x] Require host authorization hooks for every operational/admin handler and a separate webhook-ingress hook.
  - [x] Limit authorization contexts to safe identifiers; exclude raw bodies, amounts, account numbers, KYC, and card data.
  - [x] Separate admin balance/reconciliation routes from customer/payment adapters.
  - [x] Keep collection HMAC and unsigned payin/payout authoritative verification after host webhook ingress checks.
  - [x] Document source installation, TypeORM/migration setup, facade injection, protected subclasses, ownership checks, validation, domain events, and explicit webhook registration.
  - [x] Prove former `/cray/*` routes return 404 by default and host routes require guards and authorization hooks.
  - [x] Include a compiling host application example that mounts an inherited controller with a guard and customer-ownership authorization.
  - [x] Pass unit, build, and complete database/HTTP E2E verification.
