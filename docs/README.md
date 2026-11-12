# Cray v2 Integration Reference

The implementation is validated against [`cray-api-v2-docs.md`](./cray-api-v2-docs.md), sourced from [Cray v2](https://docs.crayfi.com/v2).

## Implemented provider contracts

- Collection-scoped: `POST /virtual-accounts/create`, `POST /corporate-accounts/create`, hosted checkout initialize/query, `GET /query/{reference}`, `POST /charge`, `GET /balance`, and refund initiate/query.
- Disbursement-scoped: bank directory, account validation, payout disbursement, and payout requery.
- All API calls use a scope-appropriate Bearer Secret Key. Optional ES256 signing adds `X-Signature` over the five-line canonical request when enabled.
- Webhooks use a webhook-scope API key, key-hint rotation, HMAC-SHA256 verification of the `data` object, exact-delivery fingerprinting, redacted persistence, and authoritative payout/payin requery.

## Safety behavior

- Amounts remain decimal strings and are processed with `decimal.js`.
- A fresh `ref_id` is obtained immediately before every NGN payout.
- Ambiguous financial calls stay unresolved and are never blindly replayed. Requery uses Cray's returned transaction ID only.
- Account numbers are AES-256-GCM encrypted at rest with deterministic lookup hashes where lookup is required.
- Reconciliation runs every five minutes; balance snapshots run hourly. Items without a provider transaction ID are escalated for manual review.
- Full and partial refunds use `POST /refund/initiate`; status uses `GET /refund/query/{reference}`.

## Public module contract

See the root [`README.md`](../README.md) for configuration and migration instructions. The public facade is `ICrayService`; the only registered HTTP controller is the webhook receiver.

The Wema OTP SDK helper is not exposed because the official HTTP documentation does not define an authoritative endpoint contract for it. Payment-initialization credentials are also omitted because this module does not implement those endpoints.
