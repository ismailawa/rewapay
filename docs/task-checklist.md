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
    - [x] Signs using ES256 (ECDSA P-256 / SHA-256) with DER Base64 output.
    - [x] Formats `X-Signature: t=<ms>,n=<uuid>,kid=<keyId>,v1=<sig>` per `docs.crayfi.com/v2`.
    - [x] `CrayRateLimiter` enforces 60 RPM for general endpoints and 30 RPM for financial endpoints.
    - [x] `CrayErrorMapper` maps HTTP 400/404/409/422/429/5xx into typed `CrayException`.
    - [x] Safe GET retries on transient errors; zero blind retries on financial disbursements.

- [x] **Task 3: Customer & Virtual Accounts Management**
  - **Scope:** Create permanent NGN virtual accounts, Wema Bank OTP handling, and account retrieval.
  - **Endpoints:** `POST /virtual-accounts/create`, `POST /api/virtual-accounts/generate-wallet`, `GET /virtual-accounts`.
  - **Acceptance Criteria:**
    - [x] `POST /virtual-accounts/create` handles default provider `Bloc` and `PalmPay`.
    - [x] Detects `status: 'OTP_REQUIRED'` and returns pending OTP state.
    - [x] `submitVirtualAccountOtp` activates pending account via OTP submission.
    - [x] Duplicate creation prevented if active account already exists for customer.
    - [x] `getVirtualAccount` returns sanitized account details or null.
    - [x] BVN/NIN/OTP masked in all logs and audits.
    - [x] TypeORM entities `CrayCustomer` and `CrayVirtualAccount` persisted.

- [x] **Task 4: Bank Directory & Beneficiary Validation**
  - **Scope:** Fetch supported banks with caching, validate account names, and record beneficiaries.
  - **Endpoints:** `GET /payout/banks`, `POST /payout/accounts/validate`.
  - **Acceptance Criteria:**
    - [x] `GET /payout/banks` normalizes institution codes and bank names.
    - [x] 24-hour in-memory TTL cache prevents hitting rate limits.
    - [x] `POST /payout/accounts/validate` submits 10-digit account number and bank code (no countryCode for NG).
    - [x] Captures verified `account_name` and validation session ID `ref_id`.
    - [x] Persists `CrayBeneficiary` with `ref_id` required for disbursements.
    - [x] REST controller endpoints `GET /cray/banks` and `POST /cray/banks/verify` operational.

- [x] **Task 5: Payouts / Transfers Initiation & Requery**
  - **Scope:** NGN payout disburse, status tracking, timeout safety, and failure recovery.
  - **Endpoints:** `POST /payout/disburse`, `GET /payout/requery/{transaction_id}`.
  - **Acceptance Criteria:**
    - [x] `POST /payout/disburse` sends `customer_reference`, `amount`, `account_number`, `bank_code`, `recipient_name`, `ref_id`, and `currency: "NGN"`.
    - [x] Idempotent reuse: repeated call with same reference returns original result without re-debiting.
    - [x] Auto-resolves `ref_id` via account lookup if not pre-validated.
    - [x] Critical timeout rule: ambiguous timeout preserves transaction in `PENDING` state; never marks failed or retries blindly.
    - [x] `getTransferStatus` requeries `GET /payout/requery/{transaction_id}` and maps `approved` -> `SUCCESSFUL`, `failed` -> `FAILED`.
    - [x] TypeORM entity `CrayTransfer` persisted with `@Optional()` repo injection for unit-test isolation.
    - [x] 65/65 unit tests passing across 14 suites, zero build errors.

- [x] **Task 6: Collections & Hosted Checkout**
  - **Scope:** Hosted checkout initialization, status query, and virtual account collection requery.
  - **Endpoints:** `POST /checkout/initialize`, `GET /checkout/query/{reference}`, `GET /api/query/{customer_reference}`, `POST /charge`.
  - **Acceptance Criteria:**
    - [x] Hosted checkout initializes session and returns payment link `data.link`.
    - [x] Checkout verification queries authoritative status via `GET /checkout/query/{reference}`.
    - [x] Virtual account funding verified via `GET /api/query/{customer_reference}`.
    - [x] Direct card charge gated and protected.
    - [x] 100% unit tests passing.

- [x] **Task 7: Webhook Processing & Cryptographic Verification**
  - **Scope:** Receive webhooks, verify signatures, persist events, and emit internal domain events.
  - **Endpoints:** `POST /cray/webhooks`.
  - **Acceptance Criteria:**
    - [x] Raw request body captured for signature verification.
    - [x] Collection events verified using Base64 HMAC-SHA256 (`hash` over `JSON_string(data)`).
    - [x] Payin/payout events verified via IP allowlist + server-side transaction requery.
    - [x] Emits domain events (`funding.confirmed`, `transfer.completed`, etc.) via `EventEmitter2`.
    - [x] Persists events in `cray_webhook_events` with replay capability.
    - [x] 100% unit tests passing.

- [ ] **Task 8: Idempotency & Database Persistence Layer**
  - **Scope:** Enforce database-level idempotency locks and request payload hash matching.
  - **Acceptance Criteria:**
    - [ ] `cray_idempotency` entity with unique key and request payload hash.
    - [ ] Reusing key with different payload throws `INVALID_INPUT` / `DUPLICATE_REFERENCE`.
    - [ ] Concurrency-safe atomic transaction handling.
    - [ ] 100% unit tests passing.

- [ ] **Task 9: Reconciliation Engine & Platform Balance**
  - **Scope:** Scheduled workers to reconcile pending transactions and record platform balances.
  - **Endpoints:** `GET /balance`.
  - **Acceptance Criteria:**
    - [ ] Periodic requery of pending transfers and funding transactions.
    - [ ] Hourly snapshot of Cray wallet balances (`GET /balance`).
    - [ ] Flags transactions stuck > 30 minutes for operations review.
    - [ ] 100% unit tests passing.

- [ ] **Task 10: Unified Wallet Service Facade (`ICrayService`) & Acceptance Suite**
  - **Scope:** In-process facade service implementing `ICrayService` and end-to-end sandbox verification.
  - **Acceptance Criteria:**
    - [ ] `CrayService` exports clean in-process API matching Interface Contract v0.1.
    - [ ] End-to-end integration test suite simulating full payment lifecycles.
    - [ ] Documentation and module export verification for RewaPay backend.

