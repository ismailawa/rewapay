# Cray API v1 Contract Snapshot

**Official source:** https://docs.crayfi.com/v1  
**Verified:** 13 November 2026  
**Scope:** Endpoints used by the RewaPay Cray module.

This snapshot records the v1 wire contract used by the implementation. The official documentation remains authoritative when this file and the hosted documentation differ. All paths below are complete paths appended to the gateway origin and use the `/api` namespace.

## Environments and authentication

- Staging: `https://dev-gateman.v3.connectramp.com`
- Production: `https://pay.connectramp.com`
- Every implemented server-side request sends `Authorization: Bearer <merchant_api_key>`.
- The official `crayfi` Node SDK v1.0.5 calls this value `CRAY_API_KEY` and uses it for the same ConnectRamp gateways and `/api` routes implemented here.
- `CRAYFI_PUBLIC_KEY` and `CRAYFI_SECRET_KEY` apply to separate payment-initialization/verification endpoints outside this module's scope. They are not required for balance, virtual accounts, payouts, hosted checkout, queries, or refunds.
- RewaPay maps the staging merchant API-key value to `CRAY_API_KEY`; it does not support legacy environment aliases. Cray directed RewaPay to keep the integration configuration in staging while overriding the live-contract base URL to the production gateway.

## Request signing

Optional ES256 signing uses:

```text
X-Signature: t=<milliseconds>,n=<uuid>,kid=<key-id>,v1=<base64-der-signature>
```

The signed value is five LF-separated lines with no trailing newline:

```text
METHOD
PATH_WITH_QUERY
TIMESTAMP
NONCE
BODY_SHA256_HEX
```

Canonical query rules: remove a trailing path slash; sort encoded keys and then values; decode and re-encode with RFC 3986; treat `+` as a space; write valueless parameters as `key=`; convert repeated `x[]` values to `x[0]`, `x[1]`; and keep only the final value for a repeated scalar key. The exact serialized body bytes must be both hashed and transmitted. Every retry receives a fresh timestamp and nonce.

Official vectors:

```text
/api/collection/initiate/?x[]=1&x[]=2&tag=a+b&flag&city=S%C3%A3o%20Paulo
=> /api/collection/initiate?city=S%C3%A3o%20Paulo&flag=&tag=a%20b&x%5B0%5D=1&x%5B1%5D=2

/api/balance?currency=USD&currency=NGN
=> /api/balance?currency=NGN
```

## Implemented endpoint inventory

| Capability | Method and path | Required contract notes |
|---|---|---|
| Wallet balance | `GET /api/balance` | Returns wallets in `data[]` with `currency`, `available_balance`, `locked_balance`, and `actual_balance`. |
| Virtual account | `POST /api/virtual-accounts/create` | Bloc uses `virtual_account_type`; PalmPay uses lowercase `palmpay` and `account_type`; one-time accounts use the same route. |
| Corporate account | `POST /api/corporate-accounts/create` | Requires `full_name`, `bvn`, `rc_number`, `phone`, `customer_email`, and `business_type`. |
| List virtual accounts | `GET /api/virtual-accounts` | Paginated provider account listing. RewaPay reads its encrypted local account record instead. |
| Bank directory | `GET /api/payout/banks` | Omit `countryCode` for Nigeria. |
| Account validation | `POST /api/payout/accounts/validate` | Send `account_number` and `bank_code`; response includes `account_name` and short-lived `ref_id`. |
| NGN payout | `POST /api/payout/disburse` | Send `customer_reference`, `account_number`, `bank_code`, `amount`, `recipient_name`, fresh `ref_id`, and `currency: NGN`. |
| Payout requery | `GET /api/payout/requery/{transaction_id}` | Use Cray's returned `data.reference`, never the merchant reference. |
| Hosted checkout | `POST /api/checkout/initialize` | Returns the hosted link in `data.link` and may return `data.payCode`. |
| Checkout query | `GET /api/checkout/query/{reference}` | Query by the pay code when available, otherwise merchant reference. |
| Collection query | `GET /api/query/{customer_reference}` | Authoritative query for general/virtual-account collections. |
| Direct card charge | `POST /api/charge` | Submit the `transaction_id` returned by an initialized direct-card transaction. |
| Refund initiation | `POST /api/refund/initiate` | `reference` is required; `amount` is optional for a partial refund. |
| Refund query | `GET /api/refund/query/{reference}` | Returns refund status and original transaction details. |

## Webhooks

- `collection.*` events include `hash`, calculated as Base64 HMAC-SHA256 over `JSON.stringify(data)` with the merchant API key. There is no separate webhook key or key-hint header.
- `payin` and `payout` events are unsigned and contain no `hash`. Treat them only as notifications: confirm `payin` with `GET /api/query/{reference}` and `payout` with `GET /api/payout/requery/{reference}` before emitting a terminal domain event.
- Deduplicate exact deliveries and redact account numbers, BVN, NIN, OTP, and card data before persistence.

## Financial safety invariants

- Keep all amounts as decimal strings and use `MoneyUtil`; never use floating-point arithmetic for decisions.
- Validate a payout beneficiary immediately before disbursement and pass the returned `ref_id` unchanged.
- Never blindly retry ambiguous money movement. Persist it as pending and resolve it through authoritative requery/reconciliation.
