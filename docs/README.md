# Cray API Documentation Reference (v2)

This folder contains the official API reference documentation retrieved from **https://docs.crayfi.com/v2** for offline reference, integration validation, and contract verification.

- **Full Documentation Dump:** [cray-api-v2-docs.md](file:///Users/ismailawa/Documents/Projects/rewapay-cray/docs/cray-api-v2-docs.md) (retrieved from `https://docs.crayfi.com/llms-full.txt`)

---

## Key Validated Endpoints & Schemas Summary

### 1. Environments & Base URLs
- **Staging / Sandbox:** `https://sandbox.crayfi.io`
- **Live / Production:** `https://pay.crayfi.io`

### 2. Request Authentication & Signing (`X-Signature`)
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

### 3. Virtual Accounts
- **Create Permanent / One-time Account:** `POST /virtual-accounts/create`
  - Supports Bloc (`Bloc MFB`) and PalmPay (`palmpay`).
  - Response: `{ success: true, data: { account_number, account_name, bank, sort_code, id } }`
- **Wema OTP Confirmation:** `POST /api/virtual-accounts/generate-wallet`
- **List Virtual Accounts:** `GET /virtual-accounts`

### 4. Payouts & Transfers
- **Get Banks:** `GET /payout/banks` (no query params for Nigeria, `?countryCode=GH` for Ghana).
- **Validate Beneficiary:** `POST /payout/accounts/validate`
  - Request: `{ "account_number": "...", "bank_code": "..." }` (no country_code for Nigeria).
  - Response: `{ success: true, data: { account_name, account_number, ref_id } }`
- **Process Transfer:** `POST /payout/disburse`
  - Request: `{ customer_reference, account_number, bank_code, amount, narration, recipient_name, ref_id, currency: "NGN", sender_info? }`
  - Response: `{ success: true, data: { reference, amount, status: "pending", charge, ... } }`
- **Verify Payout Status:** `GET /payout/requery/{transaction_id}`

### 5. Collections & Checkout
- **Initialize Hosted Checkout:** `POST /checkout/initialize`
- **Query Hosted Checkout:** `GET /checkout/query/{reference}`
- **Card Charge:** `POST /charge`

### 6. Balances
- **Get Wallet Balance:** `GET /balance`
