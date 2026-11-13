# Cray v1 Integration Reference

The active implementation is validated against [`cray-api-v1-docs.md`](./cray-api-v1-docs.md), sourced from [Cray v1](https://docs.crayfi.com/v1). The v2 snapshot is retained only as historical migration context and is not a runtime contract. Active v1 provider paths use `/api/...`; none use `/api/v2/...`.

For installation into an existing NestJS system, service injection, protected controller extension, and explicit webhook registration, use [`host-integration.md`](./host-integration.md). Importing `CrayModule` mounts no HTTP routes.

## Implemented provider contracts

- Accounts and collections: `POST /api/virtual-accounts/create`, `POST /api/corporate-accounts/create`, `POST /api/checkout/initialize`, `GET /api/checkout/query/{reference}`, `GET /api/query/{customer_reference}`, and `POST /api/charge`.
- Payouts: `GET /api/payout/banks`, `POST /api/payout/accounts/validate`, `POST /api/payout/disburse`, and `GET /api/payout/requery/{transaction_id}`.
- Balance and refunds: `GET /api/balance`, `POST /api/refund/initiate`, and `GET /api/refund/query/{reference}`.
- Every implemented provider call uses the same Bearer merchant API key. Optional ES256 signing adds `X-Signature` over the five-line canonical request when enabled.
- `collection.*` webhooks use the merchant API key for HMAC-SHA256 verification of `JSON.stringify(data)`. Unsigned `payin` and `payout` notifications require authoritative requery before terminal events are emitted. Deliveries are fingerprinted and redacted before persistence.

## Safety behavior

- Amounts remain decimal strings and are processed with `decimal.js`.
- A fresh `ref_id` is obtained immediately before every NGN payout.
- Ambiguous financial calls stay unresolved and are never blindly replayed. Requery uses Cray's returned transaction ID only.
- Account numbers are AES-256-GCM encrypted at rest with deterministic lookup hashes where lookup is required.
- Reconciliation runs every five minutes; balance snapshots run hourly. Items without a provider transaction ID are escalated for manual review.
- Full and partial refunds use `POST /api/refund/initiate`; status uses `GET /api/refund/query/{reference}`.

## Public module contract

See the root [`README.md`](../README.md) for configuration and migration instructions. The public facade is `ICrayService`; the only registered HTTP controller is the webhook receiver.

The Wema OTP SDK helper is not exposed because the official HTTP documentation does not define an authoritative endpoint contract for it. Payment-initialization credentials are also omitted because this module does not implement those endpoints.
