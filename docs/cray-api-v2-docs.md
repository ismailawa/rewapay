# Cray Finance API Documentation — Full Content

> Source: https://docs.crayfi.com

This file concatenates every page of the Cray Finance documentation as plain Markdown so AI assistants can ingest the entire docs in one fetch.

---

# Getting Started

## Overview

URL: https://docs.crayfi.com/v2

Our Developer Documentation is here to walk you through all the steps of integrating powerful financial services right into your application. From your initial system set up (like authentication, setting up webhooks, and understanding the request structure) to actually creating financial products (like accounts, transfers, and cards), you can expect a detailed guide on going live with the Cray API.

We treat every business as a standalone organization, and that's why you need to sign up and create your Cray account (or sign in if you already have one). You'll need to be signed into your Cray Dashboard to manage and access critical resources like your organization's authentication keys, users, applications, customers, transactions, accounts, and everything else you do with the API.

Cray supports payouts and collections in multiple currencies, enabling cross-market operations and regional scalability. Currently, Cray processes payments in the following currencies:

- **CAD**: Canada
- **EUR**: Eurozone
- **GBP**: United Kingdom
- **GHS**: Ghana
- **KES**: Kenya
- **MZN**: Mozambique
- **NGN**: Nigeria
- **USD**: United States
- **USDT**: Tether (stablecoin)
- **XAF**: Central African CFA
- **XOF**: West African CFA
- **ZAR**: South Africa
- **ZMW**: Zambia

This multi-currency support allows businesses to build localized financial experiences while operating through a single, unified API.

## Build with the Cray API!

The Cray API provides secure, reliable endpoints to power payments, collections, and financial workflows. Integrate quickly using clear REST APIs, predictable responses, and industry-standard authentication.

## What you can do

- [Collections](/v2/collections): Collect payments via Cards, Virtual accounts, Mobile Money and USDT
- [Disbursements](/v2/payouts): Initiate disbursements (payouts) and transfers
- [Conversions](/v2/conversions): Easily convert currencies and handle exchange rates in real time
- [Refunds](/v2/refunds): Quickly process full or partial refunds through the Refunds API.

## Built for developers

Our API is designed with developers in mind. Clear documentation, predictable responses, and comprehensive error handling make integration straightforward.

- [RESTful APIs with JSON responses](/v2/cray-docs/status-codes): Easy to consume, consistent, and predictable data.
- [Bearer token authentication](/v2/cray-docs/authentication): Secure access with simple token-based authorization.
- [Webhooks for real-time updates](/v2/cray-docs/webhooks): Receive instant notifications on events and transactions.
- [Sandbox and production environments](/v2/cray-docs/environments): Test safely before going live!

---

## Using This Documentation

URL: https://docs.crayfi.com/v2/cray-docs/using-docs

Learn how to make the best use of the Cray API Docs

## Here's how we think you'd make the best use of these Docs:

1. Do not skip the overview pages of any section. It contains all the required fundamentals that you need to know about a product

2. When using the API playground tool, enter an API key with the scope shown on that endpoint's page in the authentication header, and you're good to go.

3. We suggest that you test our API endpoints with your own Postman application, as the API reference may not always contain all of the endpoints that we have.

4. If you do not understand any part of the Docs, please contact [Support](mailto:hello@crayfi.com) and ask any questions you may have.

![API Playground](/Users/okeremeta/codes/cray-docs/src/assets/api-playground-2.png)

---

## Quick Start

URL: https://docs.crayfi.com/v2/cray-docs/quick-start

Go from a new account to your first signed API call.

This guide takes you from a new account to your first successful, signed API call: fetching your wallet balances with `GET /balance`.

## 1. Create an API Key

Every API key carries exactly one [scope](/v2/cray-docs/api-key-scopes) — `collection`, `disbursement` or `conversion` — and can only call the endpoints that scope covers. To create one, follow these steps:

  

    On your Cray dashboard, navigate to **Settings → Developer** and scroll down to the **"API Keys"** section.

  

  

    Create a new API key, choose its scope, and confirm with the code from your authenticator app. `GET /balance` requires no specific scope, so any `collection`, `disbursement` or `conversion` key works for this guide.

  

You send it on every request as `Authorization: Bearer <your_api_key>`. See [Authentication](/v2/cray-docs/authentication).

## 2. Register A Signing Key

Endpoints require [request signing](/v2/cray-docs/request-signing) by default. Generate a key pair and register the public key once:

```bash
openssl ecparam -name prime256v1 -genkey -noout -out cray-signing-key.pem
openssl ec -in cray-signing-key.pem -pubout -out cray-signing-key.pub.pem
```

Register `cray-signing-key.pub.pem` under **Dashboard → Settings → Developer → Request signing keys**, then confirm it by signing the challenge the dashboard shows you ([Step 3 of Request Signing](/v2/cray-docs/request-signing)). Note the key's ID — that is your `kid`.

## 3. Make Your First Call

Every endpoint path is appended to the [base URL](/v2/cray-docs/environments):

```
https://pay.crayfi.io
```

This Node.js 18+ script signs and sends `GET /balance`. Save it as `balance.mjs` and run it with `node balance.mjs`.

```js
import crypto from 'node:crypto';
import fs from 'node:fs';

const BASE_URL = 'https://pay.crayfi.io';
const API_KEY = process.env.CRAY_API_KEY;              // <your_api_key>
const KEY_ID = process.env.CRAY_SIGNING_KEY_ID;        // the key ID from the dashboard
const PRIVATE_KEY = fs.readFileSync('cray-signing-key.pem', 'utf8');

const method = 'GET';
const path = '/balance';
const body = '';                                       // GET has no body

const t = String(Date.now());                          // milliseconds
const n = crypto.randomUUID();
const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
const canonical = [method, path, t, n, bodyHash].join('\n');
const v1 = crypto.sign('sha256', Buffer.from(canonical), { key: PRIVATE_KEY, dsaEncoding: 'der' }).toString('base64');

const response = await fetch(BASE_URL + path, {
  method,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'X-Signature': `t=${t},n=${n},kid=${KEY_ID},v1=${v1}`,
  },
});
console.log(response.status, await response.json());
```

A successful call returns your wallets:

```json
{
  "status": "success",
  "message": "Account balance retrieved successfully",
  "data": [
    {
      "id": "account-uuid-1",
      "account_name": "Main Account",
      "currency": "NGN",
      "account_type": "SAVINGS",
      "account_number": "1234567890",
      "available_balance": 50000,
      "locked_balance": 5000,
      "actual_balance": 55000
    }
  ]
}
```

For signing requests with a body or a query string, use the reference implementations on the [Request Signing](/v2/cray-docs/request-signing) page.

## 4. Explore The Endpoint Examples

Every endpoint page has a **Try it!** button that opens an interactive request tool:

* **Method and URL** are filled in for the endpoint.
* **Authorization:** enter an API key with the scope shown on that endpoint's page.
* **X-Signature:** paste a signature you generated for that exact request — the tool does not sign requests for you.
* **Body:** if you are sending data to the API (like creating a new transaction), enter it in JSON format. For example:

```json
{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "10",
    "currency": "NGN",
    "phone_no": "07020615945",
    "payment_provider": "opay",
    "otp": false,
    "return_url": "https://returnurl.com"
}
```

Click **Send Request**. The response will appear at the bottom of the tool:

| Status Code | Error message |
| --- | --- |
| `OK (200)` | Success |
| `Unauthorized (401)` | Invalid credentials supplied in header, or a missing or invalid `X-Signature` |
| `Forbidden (403)` | An API key called an endpoint outside its umbrella (`SCOPE_DENIED`) |
| `Bad request (400)` | Check your JSON body formatting |

  **Response Body:** The data returned by the server, automatically formatted for readability

  Quick troubleshooting

  * System Error: IF the request fails immediately, ensure you are not blocked by a firewall or VPN.

  * JSON Error: Ensure your keys and string values are wrapped in double quotes `""`. Single quotes `''` are not valid in JSON.

  * `SIGNATURE_INVALID`: check that the signed path exactly matches the request path, that `t` is in milliseconds, and that the body you hashed is byte-for-byte the body you sent.

---

## The Cray Dashboard

URL: https://docs.crayfi.com/v2/cray-docs/dashboard

Learn how the Dashboard supports your integration needs

![The Cray Dashboard](/Users/okeremeta/codes/cray-docs/src/assets/Cray-Dashboard.avif)

The Cray Dashboard gives you all the tools and insights you need to integrate, monitor, and manage everything happening on your application through the Cray API.

As you'll see throughout this documentation, the Dashboard provides powerful back-office functionality across all our products — including creating accounts, viewing transaction details, freezing or unfreezing accounts, and more. Everything available on the Dashboard can also be performed directly via the API.

Below are a few important things to note:

### Balances

Your Cray finance dashboard is the central place for tracking all inflows and outflows across your organisation. You'll find your balances clearly displayed here.

Cray provides two types of balances on the Dashboard:

* Main Balance

* Settlement Balance

  

    Currently, Cray supports multiple currencies, including **NGN, USD, and KES**, for both balances

  

### Main Balance

Your **Main Balance** is the primary wallet on the Cray Dashboard. It works just like a business account for your organisation within Cray. All fees, commissions, transfers, and similar transactions are debited from this balance.

  Withdrawals from the Main Balance can only be done using the Transfers feature on the Dashboard.

### Settlement Balance

The **Settlement Balance** is a temporary holding balance. This is where all payments received through Checkout and Collection Accounts are settled.

When you receive funds through these channels, the money is added to your Settlement Balance. **The next working day**, Cray collates the total amount received and pays it out either to your designated settlement bank account or your Main Balance.

  **Can I withdraw from my Settlement Balance?**

  No. The Settlement Balance cannot be withdrawn from directly because it is a temporary balance.
  To access the funds, you must wait until the next working day for the payout into either your bank account or your Main Balance.

### KYB Verification

![Cray KYB](/Users/okeremeta/codes/cray-docs/src/assets/Cray-KYB.avif)

Every organisation onboarded to Cray is required to complete KYB verification. This process ensures compliance with regulatory standards and helps us maintain a secure and trusted financial ecosystem.

During KYB verification, you will not be able to go live. However, you can still explore and test the Cray API in **Test Mode**.

---

## Setting up 2FA

URL: https://docs.crayfi.com/v2/cray-docs/setting-up-2fa

Enable two-factor authentication to secure your Cray account and protect sensitive operations.

Two-factor authentication (2FA) adds an extra layer of security to your Cray account. Once enabled, you'll need to provide a time-based verification code alongside your password when performing sensitive actions.

We strongly recommend enabling 2FA immediately after creating your account. It protects against unauthorized access and is required for high-risk operations like payouts and IP whitelisting.

## Getting Started

Upon login, merchants who have not yet enabled 2FA will see a **prompt banner** on their dashboard encouraging them to set it up. Clicking the call-to-action button redirects you to the **Security** tab within the **Settings** page.

## Step-by-Step Setup

### Step 1: Navigate to Security Settings

Go to **Settings → Security** in your Cray dashboard and click **Enable 2FA**.

### Step 2: Scan the QR Code

Once you click Enable 2FA, the system automatically generates:

- A **QR code** for scanning with an authenticator app (e.g. Google Authenticator, Authy)
- A **secure setup key/URL** that can be manually entered into the authenticator app if scanning is not possible

Open your preferred authenticator app and scan the QR code, or tap "Enter setup key" and paste the provided key manually.

### Step 3: Enter the Verification Code

After scanning the QR code or entering the setup key, your authenticator app will generate a **time-based verification code** (OTP). Enter this 6-digit code in the portal to verify your setup.

### Step 4: Save Your Recovery Key

Once verified, 2FA is successfully enabled. A **secret recovery key** will be generated — store this key securely. You will need it to regain access to your account if you lose your authenticator device.

Your recovery key is shown only once. Save it in a secure location such as a password manager. Cray cannot recover this key for you.

## Actions That Require 2FA

With 2FA activated, additional verification is required for sensitive actions within the portal. You must provide your OTP when performing any of the following operations:

- **Whitelisting a new IP address**
- **Adding a new user or sub-account**
- **Initiating bulk or single payouts**
- **Creating payment links**

Each OTP is valid for a short window (typically 30 seconds). If your code expires, simply wait for a new one to be generated by your authenticator app.

---

## Environments

URL: https://docs.crayfi.com/v2/cray-docs/environments

Learn how to build on staging and production with Cray

Cray offers two distinct API environments: Sandbox (Test) and Live (Production). Understanding how each works ensures smooth integration and deployment.

## Sandbox Environment

This environment is built for testing. It mimics real-world scenarios with simulated data — so you can build, test, and debug safely without affecting actual accounts or funds.

The **Sandbox** environment provides a secure and isolated space to test Ramp's APIs. It replicates the live environment, allowing you to experiment without affecting real-world transactions.

In the sandbox, you can simulate different card payment scenarios to ensure your integration handles them correctly.

  These features are vital for validating your integration before moving to live operations.

## Live Environment

This is the production environment where real customers, data, and transactions are handled. Only move here after successful testing in the sandbox.

  **Key things to note**

  **Separation**: Sandbox and Live environments are fully isolated — with different API keys, business IDs, and credentials

  **Real vs Simulated Data:** Sandbox transactions are simulated. Live transactions involve actual money and customer data.

  **Environment URLs:**
    - **Staging**: `http://sandbox.crayfi.io/`
    - **Live:** `https://pay.crayfi.io`

---

## Authentication

URL: https://docs.crayfi.com/v2/cray-docs/authentication

Learn how to authenticate your connection to the Cray API

To interact with the Cray API, you must first authenticate your requests. Every call is authenticated with an **API key**: a key that carries exactly one [scope](/v2/cray-docs/api-key-scopes) and can only call the endpoints that scope covers. Without a valid API key, your requests will fail.

🚧 **Important:**

Requests with a missing, invalid, or incorrect API key will fail with a `401 Unauthorised` error.

**Requests also need a signature.** Every endpoint under the [base URL](/v2/cray-docs/environments) expects an `X-Signature` header in addition to your API key, unless its page says otherwise. See [Request Signing](/v2/cray-docs/request-signing).

## Finding Your API Keys

Your API keys are managed in your Cray Dashboard under **Settings → Developer**, in the **API Keys** section. Creating a key requires a code from your authenticator app. See [API Key](/v2/cray-docs/api-key-scopes) for the scopes you can choose from.

Give each service its own key, with only the scope it needs. Each endpoint page states the scope its call requires.

API keys are confidential and must never be shared publicly (for example in front-end code, public repositories, or insecure messages). Call the API only from your server, and store your keys in a secrets manager or environment variable.

## Rotating And Revoking Keys

You can revoke keys and create new ones at any time from the Developer settings page. To rotate a key without downtime, create the replacement with the same scope, deploy it to your integration, then revoke the old key.

If you suspect a key has been compromised, revoke it immediately and replace it.

## Authenticating Your API Call

To authenticate a request, include your API key in the `Authorization` header using the `Bearer` scheme.

```
Authorization: Bearer <your_api_key>
```

📘 **Note**

When adding this to your code, replace `<your_api_key>` with your actual API key. Remember to use your **Test Key** for development and your **Live Key** for production.

## Request Signing

Request signing is **required by default** on every endpoint under the base URL. You sign each request with a private key that only you hold, and Cray verifies the signature with the public key you register in the dashboard. This proves the request was not altered in transit and cannot be replayed. A request without a valid signature is rejected with `401 SIGNATURE_REQUIRED` or another `SIGNATURE_*` error. See [Request Signing](/v2/cray-docs/request-signing).

## Troubleshooting 401 And 403 Errors

If you are consistently receiving `401 Unauthorised` error responses, check for these common issues:

* **Using a revoked key:** Ensure every service has been updated with the new key before you revoke the old one.

* **Using a webhook key:** An API key with the `webhook` scope is for [webhook verification](/v2/cray-docs/webhooks) only. Using one on an API request returns `Invalid credentials supplied in header`.

* **Typo in the key:** API keys are long, complex strings. It's best to copy and paste your key directly from the dashboard. Do not type it manually.

* **Wrong environment:** Your Test Mode keys are different from your Live Mode keys. They are not interchangeable. Confirm you are using the correct key for the environment you are targeting.

* **Missing or invalid signature:** A `401` with a `SIGNATURE_*` code means the API key was fine but the request signature was not. See [Request Signing](/v2/cray-docs/request-signing).

A `403 SCOPE_DENIED` means your API key's scope does not cover the endpoint you called. Use a key with the scope shown on that endpoint's page. See [API Key](/v2/cray-docs/api-key-scopes).

---

## Request Signing

URL: https://docs.crayfi.com/v2/cray-docs/request-signing

Sign every API request with your own key to prove its integrity and origin

## Overview

Every merchant endpoint under the [base URL](/v2/cray-docs/environments) requires a signed request. You still send your API key in `Authorization: Bearer <your_api_key>`; signing adds an `X-Signature` header on top of it.

**Signing is required by default.** The account default signing mode is now **Required**, and every endpoint under the base URL enforces it. Unsigned requests are rejected with `401 SIGNATURE_REQUIRED`.

Cray never sees or stores your private key. You upload only the public key.

A valid signature proves three things:

* The request was sent by you — only your private key can produce the signature.
* The request was not modified between you and Cray.
* The request cannot be replayed.

Signing keys are managed from **Cray Dashboard → Settings → Developer → Request signing keys**. There is no API for key management.

## How It Works

1. You generate a key pair and keep the private key in your integration.
2. You register the public key in the dashboard and prove you hold the private key by signing a one-time challenge.
3. For each API request you build a five-line canonical string from the method, path, timestamp, a random nonce, and a hash of the body.
4. You sign that string with your private key (SHA-256) and send the signature in the `X-Signature` header.
5. Cray rebuilds the same string from the request it received and verifies the signature with your registered public key.
6. Cray records the nonce so the same request cannot be accepted twice.

## Step 1 — Generate A Key Pair

* Algorithm: **ES256** — ECDSA over the **P-256** curve (also called `prime256v1` or `secp256r1`) with SHA-256.
* The public key must be in **PEM (SPKI)** format — the block starting with `-----BEGIN PUBLIC KEY-----`.

```bash
# 1. Generate the private key (keep this file secret)
openssl ecparam -name prime256v1 -genkey -noout -out cray-signing-key.pem

# 2. Export the public key to upload to the dashboard
openssl ec -in cray-signing-key.pem -pubout -out cray-signing-key.pub.pem

# 3. Print it so you can copy it
cat cray-signing-key.pub.pem
```

The public key file will look like this — three to four lines between the BEGIN and END markers.

```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEdBj8Woqm829tzwhTtOtFUzFn/VVW
2EEWMx5ZlEY3yp8eYgVSYGtD4DPlVHcWFTwnrDBUCpCGHKqCL8R0t2zleQ==
-----END PUBLIC KEY-----
```

*Example — do not use.*

📘 **Tip:** Store the private key the same way you store your API keys — in a secrets manager or environment variable, never in source control or client-side code.

## Step 2 — Register Your Public Key

1. Go to **Cray Dashboard → Settings → Developer** and find the **Request signing keys** panel.
2. Click **Register key**.
3. Enter a **Key name** — anything that helps you recognise it, for example `production-server-1`.
4. Paste the full contents of your public key file, including the `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` lines.
5. Enter your **Google Authenticator code** and click **Register key**.

The dashboard then shows a **challenge** — a random string — and the key is listed with status **Pending**. You must complete Step 3 within **10 minutes**. If the challenge expires, revoke the pending key and register again.

If you close the challenge dialog, you can reopen it by clicking **Confirm** next to the pending key in the table, as long as the 10 minutes have not passed.

📘 **Note:** Every key-management action — creating, confirming, revoking, and changing the signing mode — requires a Google Authenticator (TOTP) code. If you have not set up 2FA yet, see [Setting up 2FA](/v2/cray-docs/setting-up-2fa).

## Step 3 — Confirm You Hold The Private Key

To activate the key, sign the challenge string with your private key and paste the result back into the dashboard.

* Sign the challenge **as-is**: the raw characters shown, UTF-8, **with no trailing newline**.
* Hash: **SHA-256**.
* Signature encoding: **DER**, then **base64**.

```bash
# Replace the text inside the quotes with the challenge shown in the dashboard
CHALLENGE='paste-the-challenge-here'

printf '%s' "$CHALLENGE" | openssl dgst -sha256 -sign cray-signing-key.pem | base64 | tr -d '\n'
```

Paste the output into the **Base64 challenge signature** box, enter your Google Authenticator code, and click **Confirm key**. The key's status changes to **Active**.

🚧 **Important — signature format:** Cray expects the ECDSA signature in **DER encoding** (the ASN.1 sequence of `r` and `s`). OpenSSL, Node's `crypto.sign`, Python's `cryptography`, and PHP's `openssl_sign` all produce DER by default. **Web Crypto and most "ES256" helpers produce a raw 64-byte `r‖s` signature instead — those will be rejected with "challenge verification failed" or `SIGNATURE_INVALID`.** If you are using one of those, convert the signature to DER before base64-encoding it.

## Step 4 — Sign Your Requests

### The X-Signature Header

```
X-Signature: t=<unix-ms>,n=<uuid>,kid=<key-id-uuid>,v1=<base64-signature>
```

The header is a list of comma-separated `name=value` pairs. Only these four names are allowed:

| Name | Required | Value |
| --- | --- | --- |
| `t` | Yes | Unix timestamp in **milliseconds** — digits only. |
| `n` | Yes | A UUID-format nonce, unique per request. |
| `kid` | No — recommended | The key ID (a UUID) shown for your key in the dashboard. Send it whenever you have more than one active key, so Cray knows which public key to verify with. |
| `v1` | Yes | The base64-encoded signature. |

The header is rejected (`SIGNATURE_INVALID`) if a name is repeated, a name is not one of the four above, or it has fewer than 3 or more than 4 pairs.

**`t` is in milliseconds, not seconds.** This is the most common integration mistake. `Date.now()` in JavaScript is already milliseconds; `time.time()` in Python and `time()` in PHP are seconds and must be multiplied by 1000. A seconds value is 10 digits long; a millisecond value is 13.

### The Canonical String

Exactly five lines joined with `\n` (LF) — no trailing newline, no `\r`:

```

<canonical-path-with-query>
<t>
<n>
<sha256-hex-of-raw-request-body>
```

* **Method** — upper case: `GET`, `POST`, `PATCH`, and so on.
* **Canonical path with query** — see below.
* **`t`** and **`n`** — the same values you put in the header.
* **Body hash** — the lower-case SHA-256 **hex digest** of the **raw request body**: the exact bytes you send. For a request with no body (all `GET`s, and any `POST` with an empty body) use the hash of the empty string:

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Hash the exact bytes you send.** Hash the body **after** you serialise it and send **those same bytes**. Do not re-serialise, pretty-print, or let a middleware re-encode the JSON between hashing and sending. A change in whitespace or key order produces a different hash and a `SIGNATURE_INVALID` response. A request with no body uses the hash of the empty string above — never omit the fifth line.

### The Canonical Path

**Sign the endpoint path exactly as it appears after the [base URL](/v2/cray-docs/environments).**

| You call | You sign |
| --- | --- |
| `GET {{base_url}}/balance` | `/balance` |
| `POST {{base_url}}/virtual-accounts/create` | `/virtual-accounts/create` |
| `GET {{base_url}}/subaccounts/{id}/ledger?page=2&currency=NGN` | `/subaccounts/{id}/ledger?currency=NGN&page=2` |

Path rules:

1. The path starts with `/`.
2. A trailing `/` is removed, except for the root path `/`.

### Canonical Query String

If the request has a query string, it is canonicalised and appended to the path after a `?`:

1. Split the query string on `&`.
2. For each pair, URL-decode the key and the value (`rawurldecode`), then re-encode each with `rawurlencode` — only `A-Z a-z 0-9 - _ . ~` stay unencoded; a space becomes `%20`.
3. Sort the pairs.
4. Join them with `&`.

With no query string, the canonical path has no `?`.

```
Request:   GET {{base_url}}/balance?page=2&currency=NGN&search=S%C3%A3o%20Paulo
Canonical: /balance?currency=NGN&page=2&search=S%C3%A3o%20Paulo
```

📘 **Tip:** `rawurldecode` does not treat `+` as a space, so `a+b` is signed as `a%2Bb`. Always encode spaces as `%20`. Avoid parameters without a value, and repeated or array-style keys, on signed requests.

### Worked Example

A `POST {{base_url}}/virtual-accounts/create` with the body `{"amount":1000,"currency":"NGN"}`, using `t` = `1761132000000` and `n` = `1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8`.

The body hash is the SHA-256 of exactly those bytes: `6469249697a442b13fd6384708be6aede58b356f534aee1549b252ef370a3e36`. The canonical string is:

```
POST
/virtual-accounts/create
1761132000000
1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8
6469249697a442b13fd6384708be6aede58b356f534aee1549b252ef370a3e36
```

Sign it with SHA-256 and your private key, base64-encode the signature, and send:

```bash
curl --request POST \
  --url {{base_url}}/virtual-accounts/create \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{"amount":1000,"currency":"NGN"}'
```

The `v1` value differs for every key and every request.

### Time Window And Replay Protection

* `t` must be within **±5 minutes** (300,000 ms) of Cray's server time, or the request fails with `SIGNATURE_EXPIRED`.
* Cray remembers each nonce for **330 seconds**. Reusing one fails with `SIGNATURE_REPLAYED`.

🚧 **Important:** When you retry a request for any reason, build a **new** signature with a new `t` and a new `n`. Re-sending the original headers is rejected as a replay.

### Multipart Requests

`multipart/form-data` requests cannot be signed. Sending one returns `415 SIGNATURE_MULTIPART_UNSUPPORTED`. Send JSON.

## Signing Modes

Your signing mode is set per merchant in the dashboard, and each change requires a Google Authenticator code.

| Mode | What Cray does |
| --- | --- |
| **Off** | `X-Signature` is ignored. |
| **Optional** | If `X-Signature` is present it is verified, and a bad signature is rejected. Requests without the header are accepted. |
| **Required** (default) | A valid `X-Signature` is mandatory. Requests without it are rejected with `SIGNATURE_REQUIRED`. |
| **Disabled** | Merchant API access is turned off entirely. Every call returns `403 MERCHANT_DISABLED`. |

## Signature Errors

Responses are JSON with `message` and `code` fields.

| HTTP | `code` | Meaning | What to do |
| --- | --- | --- | --- |
| 401 | `SIGNATURE_REQUIRED` | The mode requires a signature and none was sent. | Sign the request. |
| 401 | `SIGNATURE_INVALID` | Malformed header, wrong `kid`, or verification failed. | See Troubleshooting. |
| 401 | `SIGNATURE_EXPIRED` | `t` is outside the ±5 minute window. | Check your server clock (use NTP) and that `t` is in milliseconds. |
| 401 | `SIGNATURE_REPLAYED` | The nonce was already used. | Generate a fresh UUID nonce for every request, including retries. |
| 401 | `SIGNING_KEY_NOT_FOUND` | No active signing key matches. | Check the key in the dashboard; it may be pending or revoked. |
| 403 | `MERCHANT_DISABLED` | Merchant API access is disabled. | Change the signing mode in the dashboard. |
| 415 | `SIGNATURE_MULTIPART_UNSUPPORTED` | A signed request used `multipart/form-data`. | Send JSON. |
| 503 | `SIGNATURE_REPLAY_STORE_UNAVAILABLE` | The replay store is unavailable. | Retry with a **new nonce and timestamp** after a short backoff. |

## Reference Implementations

Each implementation signs the **endpoint path you append to the base URL**. Each uses **milliseconds** for `t` and hashes the body string you pass in — send that exact string.

  

Node.js 18 or later.

```js
const crypto = require('crypto');

// rawurlencode-compatible: only A-Z a-z 0-9 - _ . ~ stay unencoded.
const rawUrlEncode = (s) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function canonicalQuery(query) {
  if (!query) return '';
  return query
    .split('&')
    .map((pair) => {
      const i = pair.indexOf('=');
      const key = i < 0 ? pair : pair.slice(0, i);
      const value = i < 0 ? '' : pair.slice(i + 1);
      return `${rawUrlEncode(decodeURIComponent(key))}=${rawUrlEncode(decodeURIComponent(value))}`;
    })
    .sort()
    .join('&');
}

// path: the endpoint path you append to the base URL, e.g. '/virtual-accounts/create'.
// query: the raw query string without '?', or ''.
// body: the exact string you will send, or '' for no body.
function craySignature({ method, path, query = '', body = '' }, privateKeyPem, keyId) {
  const t = String(Date.now()); // milliseconds, not seconds
  const n = crypto.randomUUID();
  const canonicalPath = path.replace(/\/+$/, '') || '/';
  const q = canonicalQuery(query);
  const pathWithQuery = q ? `${canonicalPath}?${q}` : canonicalPath;
  const bodyHash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  const canonical = [method.toUpperCase(), pathWithQuery, t, n, bodyHash].join('\n');
  const v1 = crypto
    .sign('sha256', Buffer.from(canonical, 'utf8'), { key: privateKeyPem, dsaEncoding: 'der' })
    .toString('base64');
  return `t=${t},n=${n},kid=${keyId},v1=${v1}`;
}

// Usage
const BASE_URL = 'https://pay.crayfi.io';
const path = '/virtual-accounts/create';
const body = JSON.stringify({ amount: 1000, currency: 'NGN' }); // send exactly these bytes

const response = await fetch(BASE_URL + path, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.CRAY_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Signature': craySignature(
      { method: 'POST', path, body },
      process.env.CRAY_SIGNING_PRIVATE_KEY,
      process.env.CRAY_SIGNING_KEY_ID,
    ),
  },
  body,
});
```

  
  

PHP 8. `openssl_sign` produces a DER signature.

```php
<?php
function crayCanonicalQuery(string $query): string
{
    if ($query === '') {
        return '';
    }
    $pairs = array_map(function (string $pair): string {
        [$key, $value] = array_pad(explode('=', $pair, 2), 2, '');
        return rawurlencode(rawurldecode($key)) . '=' . rawurlencode(rawurldecode($value));
    }, explode('&', $query));
    sort($pairs, SORT_STRING);
    return implode('&', $pairs);
}

// $path: the endpoint path you append to the base URL, e.g. '/virtual-accounts/create'.
// $query: the raw query string without '?', or ''.
// $body: the exact string you will send, or '' for no body.
function craySignature(string $method, string $path, string $query, string $body, string $privateKeyPem, string $keyId): string
{
    $t = (string) (int) floor(microtime(true) * 1000); // milliseconds, not seconds
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $n = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));

    $canonicalPath = rtrim($path, '/') ?: '/';
    $q = crayCanonicalQuery($query);
    $pathWithQuery = $q === '' ? $canonicalPath : "{$canonicalPath}?{$q}";
    $canonical = implode("\n", [strtoupper($method), $pathWithQuery, $t, $n, hash('sha256', $body)]);

    if (!openssl_sign($canonical, $signature, $privateKeyPem, OPENSSL_ALGO_SHA256)) {
        throw new RuntimeException('Signing failed: ' . openssl_error_string());
    }
    return "t={$t},n={$n},kid={$keyId},v1=" . base64_encode($signature);
}

// Usage
$path = '/virtual-accounts/create';
$body = json_encode(['amount' => 1000, 'currency' => 'NGN']); // send exactly these bytes
$xSignature = craySignature('POST', $path, '', $body, file_get_contents('cray-signing-key.pem'), $keyId);
```

  
  

Python 3 with the `cryptography` package. EC signatures are DER-encoded by default.

```python
import base64, hashlib, time, uuid
from urllib.parse import quote, unquote_to_bytes
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

def canonical_query(query: str) -> str:
    if not query:
        return ""
    pairs = []
    for pair in query.split("&"):
        key, _, value = pair.partition("=")
        # rawurldecode, then rawurlencode (only A-Z a-z 0-9 - _ . ~ unencoded)
        pairs.append(f"{quote(unquote_to_bytes(key), safe='')}={quote(unquote_to_bytes(value), safe='')}")
    return "&".join(sorted(pairs))

# path: the endpoint path you append to the base URL, e.g. "/virtual-accounts/create".
# query: the raw query string without "?", or "".
# body: the exact bytes you will send, or b"" for no body.
def cray_signature(method: str, path: str, query: str, body: bytes, private_key_pem: bytes, key_id: str) -> str:
    key = serialization.load_pem_private_key(private_key_pem, password=None)
    t = str(int(time.time() * 1000))  # milliseconds, not seconds
    n = str(uuid.uuid4())
    canonical_path = path.rstrip("/") or "/"
    q = canonical_query(query)
    path_with_query = f"{canonical_path}?{q}" if q else canonical_path
    body_hash = hashlib.sha256(body).hexdigest()
    canonical = "\n".join([method.upper(), path_with_query, t, n, body_hash]).encode("utf-8")
    signature = key.sign(canonical, ec.ECDSA(hashes.SHA256()))  # DER-encoded
    return f"t={t},n={n},kid={key_id},v1={base64.b64encode(signature).decode('ascii')}"

# Usage
body = b'{"amount":1000,"currency":"NGN"}'  # send exactly these bytes
x_signature = cray_signature("POST", "/virtual-accounts/create", "", body, open("cray-signing-key.pem", "rb").read(), KEY_ID)
```

  
  

Manual testing of `GET {{base_url}}/balance`.

```bash
API_KEY='<your_api_key>'
KEY_ID='YOUR_KEY_ID'
BASE_URL='https://pay.crayfi.io'

REQUEST_PATH='/balance'                # appended to BASE_URL
SIGNED_PATH="$REQUEST_PATH"

T=$(( $(date +%s) * 1000 ))            # milliseconds
N=$(uuidgen | tr 'A-Z' 'a-z')
BODY_HASH='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'   # empty body
SIG=$(printf '%s\n%s\n%s\n%s\n%s' 'GET' "$SIGNED_PATH" "$T" "$N" "$BODY_HASH" \
  | openssl dgst -sha256 -sign cray-signing-key.pem | base64 | tr -d '\n')

curl -s "$BASE_URL$REQUEST_PATH" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-Signature: t=$T,n=$N,kid=$KEY_ID,v1=$SIG"
```

  

For Go, Java, .NET and others: any library that can produce an ECDSA P-256 / SHA-256 signature in DER form will work. If your library returns a raw 64-byte signature, convert it to DER first.

## Troubleshooting

* **`SIGNATURE_INVALID` on every request** — almost always one of: (a) the signed path does not exactly match the request path; (b) `t` is in seconds instead of milliseconds; (c) a raw `r‖s` signature instead of DER; (d) the body was re-serialised after hashing; (e) a trailing newline is in the canonical string; (f) the query string was not canonicalised. Test with `GET /balance` (no body, no query) first.

* **`SIGNATURE_EXPIRED`** — `t` is in seconds instead of milliseconds, or your server clock has drifted. Sync with NTP and generate `t` at the last moment before sending, not when the request is queued.

* **`SIGNATURE_REPLAYED` on retries** — you re-used the original headers. Every attempt needs a new `t` and `n`.

* **`SIGNING_KEY_NOT_FOUND`** — the key is still **Pending** (complete Step 3) or was **Revoked**, or the key belongs to a different environment. Staging and Live have separate keys.

* **Challenge verification failed when confirming** — the same DER issue as above, or a trailing newline was included (`echo` adds one; use `printf '%s'`), or the 10-minute window passed.

* **Works in Optional, fails in Required** — some code path is sending requests without the header (a retry queue, a second service, an old deployment). Check all callers.

---

## API Key

URL: https://docs.crayfi.com/v2/cray-docs/api-key-scopes

Every API key carries exactly one scope, checked on every request

Every API key carries exactly one scope, also called its *umbrella*. The scope is checked on every request: a key can only call the endpoints its scope covers, and anything else is denied with **`403 SCOPE_DENIED`**.

## Scopes

* `collection`
* `disbursement`
* `conversion`
* `webhook` — for [webhook verification](/v2/cray-docs/webhooks) only

**Webhook keys cannot call the API.** An API key with the `webhook` scope is for [webhook verification](/v2/cray-docs/webhooks) only. Using one on an API request returns `Invalid credentials supplied in header`.

## Which Scope An Endpoint Needs

Each endpoint page states the scope its call requires, under **Endpoint access** and in the **Authorizations** section. Browse the endpoints by section: [Collections](/v2/collections), [Payouts](/v2/payouts), [Conversions](/v2/conversions), [Refunds](/v2/refunds), [Bill Payments](/v2/bill-payments), [Sub-accounts](/v2/sub-accounts) and [Wallet](/v2/wallet).

A few endpoints require no specific scope. Their pages say so, and any `collection`, `disbursement` or `conversion` key can call them.

## Rules

* A key carries exactly one umbrella, and it is checked on every request.
* Enforcement is **fail-closed**: if the key's umbrella cannot be determined, the request is denied, not allowed through.

## Denied Requests

A request outside the key's scope returns HTTP **403** with this body:

```json
{ "status": "Error", "message": "...", "code": "SCOPE_DENIED" }
```

This envelope differs from the standard error shape used elsewhere in the API. Check for `code` = `SCOPE_DENIED` rather than relying on your usual error parsing.

## Creating an API Key

API keys are created at **Dashboard → Settings → Developer**, and creating one requires a code from your authenticator app (TOTP). If you have not set up 2FA yet, see [Setting up 2FA](/v2/cray-docs/setting-up-2fa). There is no API for creating keys.

You send an API key as `Authorization: Bearer <your_api_key>`, and requests still need a [signature](/v2/cray-docs/request-signing).

## Endpoints Without An API Key

[Hosted Checkout](/v2/collections/hosted-checkout) and the [payment-initialization endpoints](/v2/collections/payment-initialization) take no Bearer key: they identify your account from credentials in the request itself, so scopes do not apply to them.

---

## IP Whitelisting

URL: https://docs.crayfi.com/v2/cray-docs/ip-whitelisting

Restrict API access to trusted IP addresses for enhanced security

IP Whitelisting allows you to restrict API access to only specific, trusted IP addresses. This adds an extra layer of security by ensuring that requests to the Cray API can only originate from your known servers or infrastructure.

## How It Works

When IP Whitelisting is enabled, Cray will reject any API request that does not originate from one of your whitelisted IP addresses, regardless of whether a valid API key is provided.

## Setting Up IP Whitelisting

  

    Log in to your Cray Dashboard and go to **Settings → Security**.

  

  

    Enter the IP addresses you want to whitelist. You can add multiple IPs to cover all your server environments.

  

  

    Click **Save** to activate IP Whitelisting. All subsequent API requests must originate from the listed IPs.

  

  **Important:** Make sure to include all server IPs that need API access before enabling this feature. Failing to do so will block legitimate requests.

  If you use dynamic IPs or cloud infrastructure with changing addresses, consider using a static IP or a proxy to ensure consistent access.

---

## Test Credentials

URL: https://docs.crayfi.com/v2/cray-docs/test-credentials

Use test credentials to simulate transactions in the staging environment

Cray provides test credentials that allow you to simulate transactions in the staging environment without using real money or real customer data.

## Test API Keys

Test API keys are created on your Cray Dashboard under **Settings → Developer**, in the **API Keys** section. Like live keys, each test key carries exactly one [scope](/v2/cray-docs/api-key-scopes). Test and live keys are separate — a test key cannot be used in the live environment.

  Test keys only work in the **Staging** environment. They cannot be used to process real transactions.

## Test Card Details

Use the following test card details to simulate payment scenarios:

| Field | Value |
| --- | --- |
| PAN | `4084080000000409` |
| CVV | `000` |
| Expiry Month | `11` |
| Expiry Year | `26` |

  Test cards can **only** be used in the **staging environment**. They will not work in production.

  Always test your full integration flow in the staging environment before switching to live credentials. This ensures all edge cases are handled properly.

---

## Webhooks

URL: https://docs.crayfi.com/v2/cray-docs/webhooks

Learn how to use webhooks to receive real-time notifications from Cray.

Webhooks are automated messages sent from Cray to your application. They are the most reliable way to receive real-time updates when events happen in your account, such as a successful payment, a new customer, or a completed payout.

Instead of your application constantly asking our API if an event has occurred (known as “polling”), our system will instantly send a notification (a POST request) to your server when the event happens.

To start receiving these notifications, you must register a secure URL (a webhook endpoint) on your server.

## How to Set Up Your Webhook

Follow these steps to tell Cray where to send your event notifications:

- Log in to your Cray Dashboard.
- Navigate to the Your Business section from the main navigation menu.
- Click on the Webhook tab.
- On this page, find the Webhook Configuration section.
- Enable Webhooks: Check the box labeled "Enable Webhooks." This activates the feature.
- Enter Your Endpoint URL: In the "URL" field, paste the secure URL from your application that is built to listen for incoming webhook data.

**Important:** For security, this URL must be an HTTPS endpoint (it must start with https://). HTTP URLs will not be accepted.

- Save Your Configuration: Click the "Set Webhook" or "Save" button.
- Once saved, Cray will immediately begin sending live event data to this URL whenever a relevant event occurs in your account.

## Webhook Security: Verifying the Payload Signature

To ensure that the webhook events you receive are truly sent by Cray and have not been tampered with, every signed event carries an HMAC signature in its body. Webhooks are verified with your **API key with the `webhook` scope** — a dedicated [API key](/v2/cray-docs/api-key-scopes) that exists only for this purpose and cannot call the API.

We strongly recommend that you verify this signature before processing any webhook event.

### Create Your Webhook Key

Create a key with the `webhook` scope at **Dashboard → Settings → Developer**. Like every API key, creating it requires a code from your authenticator app. Store it on your server alongside your other secrets.

### The Delivered Body

Every webhook is a `POST` with `Content-Type: application/json` and a body of this shape:

```json
{
  "event": "...",
  "data": { },
  "hash": "..."
}
```

### How the Signature is Generated

`hash` is computed as:

```
base64( HMAC-SHA256( JSON of the "data" object, <your API key with the `webhook` scope> ) )
```

- **Algorithm:** HMAC-SHA256.
- **Key:** your API key with the `webhook` scope.
- **Signed content:** the JSON of the **`data` object only** — not the whole request body, and not the `event` or `hash` fields.
- **Encoding:** the digest is taken as **raw bytes, then base64-encoded** — not hex.

### Verifying the Signature (Step-by-Step)

1. **Parse the body** and read the `hash` field.
2. **Serialize the `data` object** from the body to JSON.
3. **Compute** HMAC-SHA256 over that JSON with your API key with the `webhook` scope, taking the raw digest bytes.
4. **Base64-encode** the digest.
5. **Compare** your value with `hash` using a **constant-time comparison**, to prevent timing attacks. Reject the request if they differ.

The signature is computed over our serialization of the `data` object. Re-serialize the **parsed `data` object** (preserving its field order) rather than slicing the raw request bytes — if your JSON library reorders keys or changes escaping, the recomputed hash will not match.

### Identifying Which Key Signed It

Every delivery carries this header:

```
Cray-Webhook-Key: <last 4 characters of your webhook key>
```

Use it to pick the right key when you hold more than one — for example during a rotation.

### Rotating Your Webhook Key

1. Create a new API key with the `webhook` scope in the dashboard.
2. Keep both keys on your server, and verify each delivery with the key whose last 4 characters match `Cray-Webhook-Key`.
3. Once deliveries start arriving with the new key's hint, revoke the old key and remove it from your server.

### Code Examples

#### 1. PHP

```php
<?php
// Your API keys with the `webhook` scope, indexed by their last 4 characters.
$webhookKeys = ['<your_webhook_key>'];
$keysByHint = [];
foreach ($webhookKeys as $key) {
    $keysByHint[substr($key, -4)] = $key;
}

$payload = json_decode(file_get_contents('php://input'), true);
$hint = $_SERVER['HTTP_CRAY_WEBHOOK_KEY'] ?? '';
$key = $keysByHint[$hint] ?? null;

// HMAC-SHA256 over the data object only; raw bytes (true), then base64
$expected = $key === null ? '' : base64_encode(
    hash_hmac('sha256', json_encode($payload['data']), $key, true)
);

// Constant-time comparison
if ($key !== null && isset($payload['hash']) && hash_equals($expected, $payload['hash'])) {
    // Signature valid - process the webhook
    http_response_code(200);
} else {
    // Signature invalid - reject the request
    http_response_code(403);
    exit();
}
```

#### 2. Node.js (Express)

```javascript
const crypto = require("crypto");
const express = require("express");
const app = express();

// Your API keys with the `webhook` scope, indexed by their last 4 characters.
const WEBHOOK_KEYS = ["<your_webhook_key>"];
const keysByHint = new Map(WEBHOOK_KEYS.map((key) => [key.slice(-4), key]));

app.use(express.json());

app.post("/webhook", (req, res) => {
  const { data, hash } = req.body;
  const key = keysByHint.get(req.get("Cray-Webhook-Key") || "");
  if (!key || typeof hash !== "string") return res.status(403).send("Invalid Signature");

  // HMAC-SHA256 over the data object only; raw digest, then base64
  const expected = crypto
    .createHmac("sha256", key)
    .update(JSON.stringify(data))
    .digest("base64");

  // Constant-time comparison
  const valid =
    hash.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));

  if (valid) {
    res.status(200).send("Received");
  } else {
    res.status(403).send("Invalid Signature");
  }
});
```

#### 3. Java

```java
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

public class WebhookVerifier {
    private static final String WEBHOOK_KEY = "<your_webhook_key>"; // Your API key with the `webhook` scope

    public static boolean verify(String requestBody) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode payload = mapper.readTree(requestBody);
        String receivedHash = payload.path("hash").asText();

        // Serialize the data object only (Jackson preserves field order)
        String data = mapper.writeValueAsString(payload.get("data"));

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(WEBHOOK_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        String expected = Base64.getEncoder().encodeToString(raw);

        // Constant-time comparison
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            receivedHash.getBytes(StandardCharsets.UTF_8)
        );
    }
}
```

#### 4. Go

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
)

const webhookKey = "<your_webhook_key>" // Your API key with the `webhook` scope

type webhookPayload struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
	Hash  string          `json:"hash"`
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var payload webhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// payload.Data holds the data object's exact bytes as received,
	// so no re-serialization (and no key reordering) is needed.
	mac := hmac.New(sha256.New, []byte(webhookKey))
	mac.Write(payload.Data)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// Constant-time comparison
	if hmac.Equal([]byte(expected), []byte(payload.Hash)) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Received"))
	} else {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte("Invalid Signature"))
	}
}
```

## Cray Webhook Events

Collection events (`collection.*`) include the `hash` field described above and can be verified. The `payin` and `payout` events are **not signed** and do not include a `hash` field.

### Mobile Money Collection - Successful

This event is triggered when a mobile money collection has been successfully processed and credited to your Cray account. Mobile Money webhooks are only sent once the transaction reaches a final state — `Pending` transactions do not produce an event.

**`data` fields**

| Field | Description |
| ----- | ----------- |
| customer_reference | The unique reference you supplied when initiating the transaction. Use this to reconcile. |
| transaction_reference | Cray's reference for the transaction. |
| amount | The amount collected. |
| charge | The fee deducted for this transaction. |
| netAmount | The amount credited to your balance (`amount` minus `charge`). |
| expectedAmount | The amount originally requested. Differs from `amount` on a partial payment. |
| channel | The payment type. Always `Mobile_Money` for these events. |
| sender | Object with `sender_name`, `sender_bank_code` and `sender_account_number`. For Mobile Money, `sender_name` and `sender_account_number` both carry the customer's phone number and `sender_bank_code` is `null`. |
| status | `Successful` or `Failed`. |
| provider_message | `null` on success. On failure this carries the raw provider reason code. |
| createdAt | When the transaction was created. |
| updatedAt | When the transaction reached its final state. |
| return_url | The `return_url` you sent on `/momo/initiate`. Only present when `status` is `Successful` and you supplied a `return_url`; otherwise the key is omitted. It is part of `data`, so it is covered by the `hash`. |

```json
{
  "event": "collection.mobile_money.successful",
  "data": {
    "customer_reference": "b6f4268e-2e20-4167-af84-a13f46f8344a",
    "transaction_reference": "TNW4UKB1XQZSVP86E7AR",
    "amount": "3950.00000000",
    "charge": "39.50000000",
    "netAmount": "3910.50000000",
    "expectedAmount": "3950.00000000",
    "channel": "Mobile_Money",
    "sender": {
      "sender_name": "2348146152814",
      "sender_bank_code": null,
      "sender_account_number": "2348146152814"
    },
    "status": "Successful",
    "provider_message": null,
    "createdAt": "2025-11-24T14:42:19.000000Z",
    "updatedAt": "2025-11-24T14:47:03.000000Z",
    "return_url": "https://merchant.example.com/payments/opay/return"
  },
  "hash": "pEdGMWXpneeROpaML/L7w6UPTLfciP4SCsbYaAJBAHg="
}
```

The Mobile Money webhook body does **not** include `currency`, `phone_no` or `payment_provider`. Match the event to your own record using `customer_reference`, or call `/momo/requery/{reference}` if you need those values.

### Mobile Money Collection - Failed

This event is triggered when a mobile money collection has failed. The body is identical to the successful event, except that `status` is `Failed`, `provider_message` carries the reason, and `return_url` is never included.

`provider_message` on the webhook is the **raw** provider reason code (for example `FAIL_2006`, `TIMEOUT`, `WRONG_PIN`). The Query endpoint maps the same codes to human-readable messages, so the two will not always read the same for one transaction.

```json
{
  "event": "collection.mobile_money.failed",
  "data": {
    "customer_reference": "b6f4268e-2e20-4167-af84-a13f46f8344a",
    "transaction_reference": "TNW4UKB1XQZSVP86E7AR",
    "amount": "3950.00000000",
    "charge": "0.00000000",
    "netAmount": "0.00000000",
    "expectedAmount": "3950.00000000",
    "channel": "Mobile_Money",
    "sender": {
      "sender_name": "2348146152814",
      "sender_bank_code": null,
      "sender_account_number": "2348146152814"
    },
    "status": "Failed",
    "provider_message": "FAIL_2006",
    "createdAt": "2025-11-24T14:42:19.000000Z",
    "updatedAt": "2025-11-24T14:47:03.000000Z"
  },
  "hash": "KqeuzxTTts/DfLOW2kFfIRIi+jquDHLzEcDmGcBW01M="
}
```

### Payin Webhook

This event is triggered when a general payin transaction (bank transfer, card, etc.) reaches a final state.

```json
{
  "event": "payin",
  "data": {
    "type": "bank_transfer",
    "reference": "48LWAY7FE5RTNGD1759213240",
    "amount": "1000.00",
    "net_amount": "990.00",
    "charge": "10.00",
    "status": "Successful",
    "sender": {
      "sender_name": "John Doe",
      "sender_account_number": "0123456789",
      "narration": "Payment for invoice"
    }
  }
}
```

### Payout Webhook - Successful

This event is triggered when a payout (disbursement) has been successfully processed and funds have been sent to the recipient.

```json
{
  "event": "payout",
  "data": {
    "reference": "76F38215SRTXENH1759359170",
    "amount": "1600.00",
    "net_amount": "1300.00",
    "charge": "300.00",
    "status": "Successful",
    "recipient": {
      "recipient_name": "John Doe",
      "recipient_account_number": "0123456789",
      "recipient_bank_code": "058"
    }
  },
  "key": "pk_live_xxxxx"
}
```

### Payout Webhook - Failed

This event is triggered when a payout (disbursement) has failed.

```json
{
  "event": "payout",
  "data": {
    "reference": "76F38215SRTXENH1759359170",
    "amount": "1600.00",
    "net_amount": "1300.00",
    "charge": "300.00",
    "status": "Failed",
    "recipient": {
      "recipient_name": "John Doe",
      "recipient_account_number": "0123456789",
      "recipient_bank_code": "058"
    }
  },
  "key": "pk_live_xxxxx"
}
```

## Failed Deliveries

Failed deliveries can be reviewed and retried from your Cray Dashboard.

---

## Status Codes

URL: https://docs.crayfi.com/v2/cray-docs/status-codes

Cray categorizes transaction outcomes into distinct statuses

### CLR001 – Security Violation

This transaction was flagged and declined due to exceeding the allowed number of transactions within a specific time frame (velocity limit) for the card. This is a preventive measure against potential misuse or automated fraudulent activity.

### CLR002 – Security Violation

This transaction failed an internal fraud detection mechanism. It may have been identified as suspicious due to unusual patterns such as high-risk geolocation, blacklisted accounts, or anomalies in behavior based on historical data.

### CLR003 – Single Transaction Limit Exceeded

The transaction amount exceeded the maximum allowed limit for a single transaction, as defined by cardholder or account policy. To proceed, the transaction must be split or limits adjusted.

### Pending — Initiated Charge

The transaction has been initiated and is awaiting further processing. It may be awaiting a user action (e.g., OTP or 3D Secure authentication).

### Successful

The transaction was processed and authorized without any issues.

### Failed

The transaction could not be completed due to an error. This may be due to insufficient funds, declined authorization, or system-level interruptions.

### Abandoned

The user initiated the transaction but did not complete the required steps. This typically happens when users close the app/browser, get redirected without finalizing payment, or fail to respond to authentication prompts.
  
  
### PMN-96-422 – System Malfunction

The transaction failed due to an internal system malfunction on the payment network or processing platform. Please retry the transaction later or contact support if the issue persists.

### PMN-59-422 – Suspected Fraud

The transaction was declined because it was flagged as potentially fraudulent based on risk or security checks. To proceed, verify the transaction details or follow additional authentication and fraud-prevention procedures.
  
  
### E03 – Insufficient Balance (Default)

The transaction could not be completed due to insufficient wallet balance. To proceed, ensure the sender has adequate funds.

### E04 – System Error (ETP)

The transaction failed due to a temporary system error on the payment processing platform. Please retry the transaction later.

### E05 – Insufficient Balance

The sender's wallet balance is insufficient to process the transaction. To proceed, top up the wallet and retry.

### E06 – Insufficient Balance or Limit Reached

The transaction failed because the sender's wallet balance is insufficient or a transaction limit has been reached. To proceed, ensure sufficient balance and verify applicable limits.

### E08 – Transaction Limit Exceeded

The transaction amount exceeds the allowed wallet, daily, or per-transaction limit. To proceed, reduce the amount or adjust the applicable limits.
  
  
### E01 – Invalid PIN Length

The transaction failed because the provided PIN does not meet the required length. To proceed, ensure the PIN matches the configured minimum and maximum length.

### E02 – Insufficient Balance

The sender's wallet does not have enough funds to complete the transaction. To proceed, fund the wallet and retry.

### E07 – Internal Processing Error

The transaction could not be completed due to an internal processing error. Please retry the transaction or contact support if the issue persists.

### E09 – Invalid Sender MSISDN

The sender's mobile number (MSISDN) is invalid or improperly formatted. To proceed, provide a valid and correctly formatted MSISDN.

### E10 – Invalid OTP

The one-time password (OTP) provided is incorrect or has expired. To proceed, request a new OTP and retry.

### E11 – Payment Request Failed

The payment request could not be initiated or completed successfully. Please retry the request or contact support if the issue persists.

### E12 – Sender Account Not Active

The sender's mobile money account is inactive, suspended, or not registered. To proceed, activate the account before retrying.

### E13 – Invalid Payee MSISDN

The recipient's mobile number (MSISDN) is invalid or improperly formatted. To proceed, provide a valid recipient MSISDN.

### E14 – Transaction Timeout During Approval

The transaction timed out while awaiting user or system approval. Please retry the transaction.

### E15 – Transaction Timeout

The transaction could not be completed due to a timeout. Please retry the transaction later.

### E16 – Wrong PIN

The transaction failed because an incorrect PIN was provided. To proceed, enter the correct PIN.
  
  
### 200 – Success

Standard success response for conversion initialization, completion, listing, setting and fetching rates, and when a quote is generated.

### 401 – Unauthorized

When a user cannot be identified for a dispute request.

### 403 – Forbidden

The FX_CONVERSION feature is not available for the user.

### 404 – Not Found

- Quote ID is invalid or expired.
- Transaction (credit or debit) not found during completion.
- Conversion not found during dispute creation.
- Merchant not found when setting custom rates.
- Rate not found (general, merchant-specific, or by ID).

### 409 – Conflict

An open dispute already exists for the conversion reference.

### 412 – Precondition Failed

- Unable to fetch source or destination wallet.
- Insufficient balance in the source wallet.

### 422 – Unprocessable Entity

- Invalid quote payload (amount or rate <= 0).
- Missing merchant or destination account info during completion.
- Not eligible for dispute.
- Invalid currency pair (Source and Destination are the same).
- Invalid source or destination currency codes.

### 500 – Server Error

- Balance check failed.
- Debit failed or conversion initialization failed.
- Completion process failed.

### 503 – Service Unavailable

Unable to fetch live FX rates from the external service.
  
  
Returned by endpoints that enforce [Request Signing](/v2/cray-docs/request-signing). Responses are JSON with `message` and `code` fields.

### 401 – SIGNATURE_REQUIRED

Your signing mode requires a signature and the request had no `X-Signature` header. Sign the request.

### 401 – SIGNING_KEY_NOT_FOUND

No active signing key on your account matches. Check the key ID in the dashboard; the key may be pending or revoked.

### 401 – SIGNATURE_INVALID

The header is malformed, the `kid` is wrong, or the signature does not verify against the signing string Cray rebuilt.

### 401 – SIGNATURE_EXPIRED

The `t` value is more than 5 minutes from Cray's server time. Check your server clock and generate `t` immediately before sending.

### 401 – SIGNATURE_REPLAYED

This key ID and nonce combination has already been used. Generate a fresh UUID nonce for every request, including retries.

### 415 – SIGNATURE_MULTIPART_UNSUPPORTED

The request used `multipart/form-data`. Signed endpoints do not accept multipart bodies — send JSON.

### 503 – SIGNATURE_REPLAY_STORE_UNAVAILABLE

Cray could not record the nonce and refused the request rather than risk a replay. Retry with a new nonce and new timestamp after a short backoff.

### 403 – MERCHANT_DISABLED

Your signing mode is set to **Disabled**, which turns off merchant API access entirely. Every API call returns this error until the mode is changed in the dashboard.
  
  
Returned when an API key calls an endpoint outside its umbrella. See [API Key](/v2/cray-docs/api-key-scopes).

### 403 – SCOPE_DENIED

The API key does not carry the umbrella this endpoint requires (`collection`, `disbursement` or `conversion`), or the key's umbrella could not be resolved. Use a key with the scope shown on that endpoint's page. Unlike other errors, this one uses the envelope `{ "status": "Error", "message": "...", "code": "SCOPE_DENIED" }`.
  

Understanding these statuses helps in monitoring transaction outcomes and implementing appropriate business logic.

---

## SDKs

URL: https://docs.crayfi.com/v2/cray-docs/sdks

Explore our SDKs designed to simplify integration across multiple programming languages and frameworks.

Whether you're building a mobile app, a web application, or integrating with a popular e-commerce platform, we've got SDKs tailored to your specific needs. Each solution is designed to streamline the integration process, allowing you to focus on building great products while leveraging our powerful payments infrastructure.

Our SDKs are designed to simplify the integration of our payment APIs across multiple programming languages and development frameworks. With our SDKs, developers can access various features such as Cards, Mobile money, Foreign exchange and more. Each SDK is equipped with comprehensive documentation to guide you through the installation, authentication, and usage process, making the integration experience smooth and efficient.

## Supported SDKs

Our Go SDK is designed for backend and infrastructure engineers building high-performance, scalable services with Cray APIs. It offers a lightweight, type-safe interface with minimal overhead, making it ideal for microservices, high-throughput systems, and cloud-native architectures where reliability and efficiency are critical.

[View on GitHub →](https://github.com/noibilism/crayfi-go)

Under the hood, the SDK is a thin wrapper around Cray's payment gateway: it takes care of authentication, request formatting, and error handling, so your application code can simply call a Go function instead of hand-building HTTP requests. It supports every major part of the Cray platform — cards, mobile money, wallets, currency conversion, payouts, refunds, virtual accounts, hosted checkout, and crypto — all through the same consistent client.

## Getting Started

Before you can call any Cray endpoint, you need to pull the package into your project and import it. This is a standard Go module, so it works with the regular Go toolchain.

```bash
go get github.com/noibilism/crayfi-go
```

```go
import crayfi "github.com/noibilism/crayfi-go"
```

## How Configuration Works

The SDK needs to know three things to talk to Cray: which API key identifies your account, which environment (sandbox or live) to send requests to, and how patient to be when a request is slow or fails. Rather than making you pass all of this in every time, the SDK can pick it up automatically from a `.env` file in your project, which it loads on its own the first time it's used.

```env
CRAY_API_KEY=<your_api_key>
CRAY_ENV=sandbox
CRAY_BASE_URL=http://sandbox.crayfi.io
CRAY_TIMEOUT=30
CRAY_RETRIES=2
```

The environment you choose determines which server your requests actually reach — sandbox for testing with fake money, live for real transactions:

| Environment | Base URL |
| --- | --- |
| Sandbox/dev | `http://sandbox.crayfi.io` |
| Live | `https://pay.crayfi.io` |

You don't need to set `CRAY_BASE_URL` yourself in most cases — the SDK works it out for you from `CRAY_ENV`. If `CRAY_ENV` isn't set to `live`, it quietly defaults to the sandbox URL; set it to `live` and it switches to the production gateway. This means going live is usually a one-line change, not a code rewrite.

## Setting Up the Client

Everything you do with the SDK starts with creating a client. This is the object that remembers your credentials and settings so you don't have to repeat them on every call. There are a few ways to create one, depending on how much control you want.

The simplest way is to hand your API key straight to the constructor:

```go
client, err := crayfi.New("<your_api_key>")
if err != nil {
    panic(err)
}
```

If you'd rather keep the key out of your code entirely, pass an empty string and the SDK will read `CRAY_API_KEY` from your environment instead:

```go
client, err := crayfi.New("")
if err != nil {
    panic(err)
}
```

When you need finer control — for example, forcing sandbox mode, or tuning how long the SDK waits before giving up on a slow request and how many times it retries — you can chain on options:

```go
client, err := crayfi.New(
    "<your_api_key>",
    crayfi.WithEnv("sandbox"),
    crayfi.WithTimeout(30),
    crayfi.WithRetries(2),
)
```

And if you're pointing at a custom or self-hosted gateway rather than Cray's standard sandbox/live URLs, you can override the base URL directly:

```go
client, err := crayfi.New(
    "<your_api_key>",
    crayfi.WithBaseURL("http://sandbox.crayfi.io"),
)
```

Whichever way you build it, every request the client sends carries the same three headers behind the scenes, proving who you are and what format you're speaking:

```http
Authorization: Bearer 
Accept: application/json
Content-Type: application/json
```

## How Responses and Errors Work

To keep things predictable, every single method on the client — no matter what it does — returns the same two things: a response and an error. This means you always handle the outcome the same way, whether you're checking a wallet balance or sending a payout.

```go
(interface{}, error)
```

In practice, that looks like this: call the method, check the error first, and if there isn't one, the response holds whatever data came back from Cray.

```go
response, err := client.Wallets.Balances()
if err != nil {
    return err
}
fmt.Printf("%+v\n", response)
```

Not all failures are the same, though, so the SDK doesn't just hand you a generic error. It distinguishes between a few typed error kinds — `AuthenticationException` for bad or missing credentials, `ValidationException` for a malformed request, `TimeoutException` for a request that took too long, and `APIException` for everything else the gateway rejected — so your code can respond differently depending on what actually went wrong, instead of treating every failure the same way.

## Accepting Card Payments

### Starting a Card Transaction

This is how you begin charging a customer's card. Before calling it, you need a real `subaccount_id` — fetch one first by calling the wallets method described further down, since the gateway will reject the request without a valid subaccount attached to it. Once you have that, you pass along the transaction amount, the card details, and the customer's information, and the SDK sends it all to Cray to kick off the payment.

```go
response, err := client.Cards.Initiate(map[string]interface{}{
    "reference":     "unique-reference",
    "subaccount_id": "subaccount_id_from_wallets_subaccounts",
    "amount":        "100",
    "currency":      "NGN",
    "callback_url":  "https://example.com/webhooks/cray",
    "card_data": map[string]interface{}{
        "pan":         "5399832641760090",
        "cvv":         "146",
        "expiryMonth": "05",
        "expiryYear":  "50",
    },
    "customer_information": map[string]interface{}{
        "email":       "customer@example.com",
        "firstName":   "Postman",
        "lastName":    "Tester",
        "mobilePhone": "2290161248277",
    },
})
```

### Completing the Charge

Initiating a transaction doesn't move any money by itself — it just prepares it. This step takes the `transaction_id` you got back from initiating the payment and actually completes the charge against the card.

```go
response, err := client.Cards.Charge(map[string]interface{}{
    "transaction_id": "transaction_id_from_initiate",
})
```

### Checking a Transaction's Status

Once a charge is underway, you'll often want to check where it stands — whether it succeeded, failed, or is still processing. This method looks a transaction up by either your own reference or Cray's transaction reference and tells you its current state.

```go
response, err := client.Cards.Query("merchant_reference_or_transaction_reference")
```

## Accepting Mobile Money Payments

### Starting a Mobile Money Payment

Mobile money works a little differently depending on the country and currency involved, so the fields you send vary slightly. For West and Central African currencies (XOF/XAF), you provide the customer's phone number, country, and name directly:

```go
response, err := client.MoMo.Initiate(map[string]interface{}{
    "customer_reference": "unique-reference",
    "amount":             "200",
    "currency":           "XOF",
    "phone_no":           "2290161248277",
    "payment_provider":   "MTN",
    "country":            "benin",
    "firstname":          "Postman",
    "lastname":           "Tester",
})
```

For Nigerian Naira (NGN) payments, the shape is slightly different — instead of a country, you supply a `return_url` the customer is sent back to once they've completed the payment on their phone. Supported NGN providers are `opay` and `palmpay`:

```go
response, err := client.MoMo.Initiate(map[string]interface{}{
    "customer_reference": "unique-reference",
    "amount":             "100",
    "currency":           "NGN",
    "phone_no":           "08012345678",
    "payment_provider":   "MTN",
    "return_url":         "https://example.com/return",
})
```

### Checking a Mobile Money Payment's Status

Mobile money payments are approved by the customer on their phone, so they don't complete instantly. Use this method to poll and find out whether a payment you started has gone through yet.

```go
response, err := client.MoMo.Requery("customer_reference")
```

## Working With Wallets

### Viewing Your Balances

This gives you a live snapshot of how much money sits in your Cray wallet, broken down across the currencies you hold.

```go
response, err := client.Wallets.Balances()
```

### Listing Your Subaccounts

Subaccounts are the individual accounts Cray uses to route and settle transactions, and you'll need their IDs for other operations, like starting a card payment. This method fetches the list of subaccounts available to you so you can pick the right one.

```go
response, err := client.Wallets.Subaccounts()
```

## Converting Currencies

### Getting an Exchange Rate

Before converting money from one currency to another, you'll usually want to know what rate you'd get. This returns the current exchange rate between two specific currencies you name.

```go
response, err := client.FX.Rates(map[string]interface{}{
    "source_currency":      "NGN",
    "destination_currency": "USD",
})
```

### Getting All Rates for a Currency

Instead of asking about one specific currency pair, this returns the rates for converting into a single destination currency from every currency Cray supports — handy if you want to show a customer their options at a glance.

```go
response, err := client.FX.RatesByDestination(map[string]interface{}{
    "destination_currency": "USD",
})
```

### Requesting a Conversion Quote

Rates can move, so before you actually convert money, you lock one in with a quote. This tells Cray how much of the source currency you want to convert and gets back a `quote_id` that holds the rate steady for a short window.

```go
response, err := client.FX.Quote(map[string]interface{}{
    "source_currency":      "NGN",
    "destination_currency": "USD",
    "source_amount":        "100",
})
```

### Executing the Conversion

With a quote in hand, this is the step that actually moves the money — it takes the `quote_id` from the previous step and converts your funds at the rate that was locked in.

```go
response, err := client.FX.Convert(map[string]interface{}{
    "quote_id": "quote_id_from_quote_response",
})
```

### Viewing Your Conversion History

This returns the list of currency conversions you've made, so you can review what's happened over time.

```go
response, err := client.FX.Conversions()
```

### Disputing a Conversion

If a conversion didn't go the way it should have — it failed, timed out, or settled late — you can raise a dispute against it. The `reason` you give must be one of a fixed set of values: `failed`, `processing_timeout`, `settlement_delay`, or `other`, and you should include a clear description so the dispute can be reviewed properly.

```go
response, err := client.FX.DisputeConversion("conversion_id", map[string]interface{}{
    "reason":      "other",
    "description": "Dispute description with enough detail for review.",
})
```

## Sending Fiat Payouts

### Finding Available Payout Methods

Different countries support different ways of paying money out — bank transfer, mobile money, and so on. This tells you which methods are available for a given country before you attempt a payout there.

```go
response, err := client.Payouts.PaymentMethods("NG")
```

### Listing Supported Banks

To send money to a bank account, you need the receiving bank's code. This method returns the list of banks Cray supports, and you can narrow it down to a single country by passing a country code — or leave it as an empty string to see all of them.

```go
response, err := client.Payouts.Banks("NG")
```

### Validating a Bank Account

Before sending money out, it's good practice to confirm the account you're paying into actually exists and belongs to who you think it does. This checks an account number against a bank code and returns the account holder's details for you to verify.

```go
response, err := client.Payouts.ValidateAccount(map[string]interface{}{
    "account_number": "0123456789",
    "bank_code":      "044",
})
```

### Sending a Payout

This is the method that actually disburses money — it moves funds out of your Cray wallet and into the recipient's bank account, identified by the account number and bank code you provide, along with an amount, currency, and a note describing what the payment is for.

```go
response, err := client.Payouts.Disburse(map[string]interface{}{
    "customer_reference": "unique-reference",
    "account_number":     "0123456789",
    "bank_code":          "044",
    "ref_id":             "unique-ref-id",
    "amount":             "100",
    "currency":           "NGN",
    "narration":          "SDK payout test",
})
```

### Checking a Payout's Status

Payouts can take a moment to settle on the receiving bank's side, so this lets you look up a payout by its transaction ID and see whether it's completed, failed, or still in progress.

```go
response, err := client.Payouts.Requery("transaction_id")
```

## Handling Refunds

### Issuing a Refund

When a customer needs their money back, this reverses an existing transaction. You reference the original transaction and specify how much of it to refund, which is useful if you only want to refund part of a payment.

```go
response, err := client.Refunds.Initiate(map[string]interface{}{
    "reference": "original_transaction_reference",
    "amount":    "100",
})
```

### Checking a Refund's Status

Just like payments, refunds take a little time to process. This looks one up to tell you whether it's gone through yet.

```go
response, err := client.Refunds.Query("refund_or_transaction_reference")
```

## Managing Virtual Accounts

### Creating a Permanent Virtual Account

A virtual account gives a customer their own dedicated account number they can send money to repeatedly, and every deposit made to it is automatically attributed to them. This creates one that stays open indefinitely, tied to the customer's name, email, and (where required) their BVN for verification.

```go
response, err := client.VirtualAccounts.Create(map[string]interface{}{
    "reference":      "unique-reference",
    "account_name":   "Customer Wallet",
    "customer_email": "customer@example.com",
    "currency":       "NGN",
    "account_type":   "Permanent",
    "bvn":            "12345678901",
})
```

### Creating a One-Time Virtual Account

Sometimes you only need an account number for a single payment rather than an ongoing relationship — for example, to collect one specific invoice amount. This creates a temporary account scoped to a fixed amount, which closes once the payment is made.

```go
response, err := client.VirtualAccounts.Initiate(map[string]interface{}{
    "reference":      "unique-reference",
    "account_name":   "Temporary Customer Account",
    "customer_email": "customer@example.com",
    "amount":         "100",
    "currency":       "NGN",
    "account_type":   "onetime",
})
```

### Listing Your Virtual Accounts

This returns every virtual account you've created so far, so you can see what's active across your customers.

```go
response, err := client.VirtualAccounts.List()
```

### Viewing Supported Providers

Virtual accounts are issued through partner banking providers, and this tells you which providers are available to issue accounts through.

```go
response, err := client.VirtualAccounts.Providers()
```

### Verifying a Customer With an OTP

For certain virtual account flows, the customer needs to confirm their identity with a one-time password sent to them before the wallet is generated. This submits that OTP alongside the customer's email to complete the verification and generate the wallet.

```go
response, err := client.VirtualAccounts.GenerateWallet(map[string]interface{}{
    "otp":            "123456",
    "customer_email": "customer@example.com",
})
```

There's also a `SubmitOtp` method that does exactly the same thing — it's simply a more intuitively named alias for the method above, in case that reads more clearly at your call site.

```go
response, err := client.VirtualAccounts.SubmitOtp(map[string]interface{}{
    "otp":            "123456",
    "customer_email": "customer@example.com",
})
```

## Using Hosted Checkout

### Creating a Checkout Session

If you'd rather not build your own payment form, Cray can host one for you. This creates a checkout session — you describe the amount, currency, which payment methods to offer (card, transfer, etc.), and the customer's details — and Cray returns a page you can redirect the customer to in order to complete payment.

```go
response, err := client.Checkout.Initialize(map[string]interface{}{
    "reference":            "unique-reference",
    "amount":               "100",
    "currency":             "NGN",
    "defaultPaymentMethod": "card",
    "feeBearer":            "merchant",
    "customer": map[string]interface{}{
        "email": "customer@example.com",
        "name":  "Postman Tester",
    },
    "paymentMethods": []string{"card", "transfer"},
    "callback_url":   "https://example.com/webhooks/cray",
    "metadata": map[string]interface{}{
        "source": "sdk-docs",
    },
})
```

### Checking a Checkout Session's Status

Once a customer has been sent to a checkout page, use this to look up what happened — whether they completed payment, abandoned it, or it's still pending.

```go
response, err := client.Checkout.Query("checkout_reference")
```

## Collecting Crypto Payments

### Viewing Supported Assets

Before setting up a crypto vault, it helps to know which cryptocurrencies Cray can currently collect. This returns that list.

```go
response, err := client.Crypto.SupportedAssets()
```

### Creating a Collection Vault

A vault is a dedicated crypto address for receiving a specific asset, similar in spirit to a virtual account for fiat. This creates one for a given asset (like USDT), giving you a name and profile to organize it under.

```go
response, err := client.Crypto.CreateVault(map[string]interface{}{
    "name":    "Customer USDT Vault",
    "assetId": "USDT",
    "profile": "default",
})
```

## Sending Crypto Payouts

### Viewing Supported Assets for Payouts

Just as with collection, it's worth checking which crypto assets can be paid out before you try to send one.

```go
response, err := client.CryptoPayouts.SupportedAssets()
```

### Adding a Payout Beneficiary

Before you can send crypto to someone, you register their wallet as a beneficiary — giving it a name and reference so you can send to it repeatedly without re-entering the wallet address every time.

```go
response, err := client.CryptoPayouts.AddBeneficiary(map[string]interface{}{
    "name":            "Customer Wallet",
    "customer_ref_id": "customer_wallet_reference",
    "asset":           "USDT",
    "wallet_address":  "0x0000000000000000000000000000000000000000",
    "profile":         "default",
})
```

### Sending a Crypto Payout

With a beneficiary registered, this actually sends the crypto payout — referencing the beneficiary you added, along with the amount, currency, and a narration describing the payment.

```go
response, err := client.CryptoPayouts.InitiatePayout(map[string]interface{}{
    "customer_reference": "unique-reference",
    "address_reference":  "customer_wallet_reference",
    "currency":           "USDT",
    "amount":             "10",
    "narration":          "SDK crypto payout test",
})
```

## Recovering From Failed Payout Webhooks

### Viewing Failed Webhook Notifications

When Cray tries to notify your system about a payout event and the delivery fails (say, your server was down), it keeps a record. This method lists those failed webhook deliveries so you know what notifications you might have missed.

```go
response, err := client.Webhooks.FailedPayoutWebhooks()
```

### Retrying a Failed Webhook

Once you've fixed whatever caused the delivery to fail, use this to ask Cray to resend a specific webhook, identified by its ID, so your system gets the notification it missed.

```go
response, err := client.Webhooks.RetryFailedPayoutWebhook("webhook_id")
```

Our Node.js SDK is ideal for server-side developers looking to integrate Cray APIs into backend applications with speed and flexibility. It enables full control over payment and wallet workflows and fits seamlessly into modern JavaScript stacks, making it well-suited for custom payment solutions, APIs, and event-driven systems.

[View on npm →](https://www.npmjs.com/package/crayfi)

Like the other SDKs, this is a thin wrapper around Cray's payment gateway: it handles authentication, request formatting, and error handling for you, so your application code just calls a JavaScript/TypeScript method instead of hand-building HTTP requests. It covers the same ground across the platform — cards, mobile money, wallets, currency conversion, payouts, refunds, virtual accounts, hosted checkout, and crypto — all through one client, with full TypeScript types included.

## Getting Started

The package is published to npm under the name `crayfi`. Install it the usual way, and if you're on TypeScript, the types come bundled in the package itself, so there's nothing extra to install.

```bash
npm install crayfi
```

## How Configuration Works

The SDK needs three things to talk to Cray: which API key identifies your account, which environment (sandbox or live) to send requests to, and how patient to be when a request is slow. You can either pass these directly when you create the client, or let it read them from environment variables — whichever fits your setup better.

```env
CRAY_API_KEY=<your_api_key>
CRAY_ENV=sandbox
CRAY_BASE_URL=http://sandbox.crayfi.io
CRAY_TIMEOUT=30
CRAY_RETRIES=2
```

The environment you choose determines which server your requests actually reach — sandbox for testing with fake money, live for real transactions:

| Environment | Base URL |
| --- | --- |
| Sandbox/dev | `http://sandbox.crayfi.io` |
| Live | `https://pay.crayfi.io` |

You don't need to set `CRAY_BASE_URL` yourself in most cases — the SDK works it out for you from `CRAY_ENV`. If `CRAY_ENV` isn't set to `live`, it quietly defaults to the sandbox URL; set it to `live` and it switches to the production gateway.

## Setting Up the Client

Everything starts with creating a `Cray` client instance, which remembers your credentials and settings so you don't have to repeat them on every call. The simplest way is to pass your key and environment straight in:

```ts
import { Cray } from "crayfi";

const cray = new Cray(process.env.CRAY_API_KEY, "sandbox");
```

If you'd rather keep the constructor call bare and let it read everything from your `.env` file automatically, you can do that too:

```ts
import { Cray } from "crayfi";

const cray = new Cray();
```

The full constructor accepts your key, environment, timeout, retry count, and an optional custom base URL, in that order, all with sensible defaults so you only need to specify what you want to override:

```ts
new Cray(apiKey?: string, env = "sandbox", timeout = 30, retries = 2, baseUrl?: string)
```

Whichever way you build it, every request the client sends carries the same three headers behind the scenes, proving who you are and what format you're speaking:

```http
Authorization: Bearer 
Accept: application/json
Content-Type: application/json
```

## How Errors Work

Rather than throwing one generic error for everything that can go wrong, the SDK throws a specific typed error depending on what actually happened, so you can catch and handle each situation differently:

| Error | When it is thrown |
| --- | --- |
| `CrayAuthenticationException` | API key is missing or the API returns `401` |
| `CrayValidationException` | API returns `400` or `422` |
| `CrayTimeoutException` | Request times out or retries are exhausted |
| `CrayApiException` | Other API/network errors |

In practice, you wrap a call in a try/catch and check which error type came back — for example, a validation error carries the specific field errors returned by the API, which you can surface back to your user:

```ts
import { Cray, CrayValidationException } from "crayfi";

try {
  const cray = new Cray();
  const response = await cray.wallets.balances();
  console.log(response);
} catch (error) {
  if (error instanceof CrayValidationException) {
    console.error(error.message, error.errors);
  }
  throw error;
}
```

## Accepting Card Payments

### Starting a Card Transaction

This is how you begin charging a customer's card. Before calling it, you need a real `subaccount_id` — fetch one first with the wallets method described further down, since the gateway will reject the request without a valid subaccount attached to it. Once you have that, you pass along the transaction amount, the card details, and the customer's information, and the SDK sends it all to Cray to kick off the payment.

```ts
const response = await cray.cards.initiate({
  reference: crypto.randomUUID(),
  subaccount_id: "subaccount_id_from_wallets_subaccounts",
  amount: "100",
  currency: "NGN",
  callback_url: "https://example.com/webhooks/cray",
  card_data: {
    pan: "5399832641760090",
    cvv: "146",
    expiryMonth: "05",
    expiryYear: "50",
  },
  customer_information: {
    email: "customer@example.com",
    firstName: "Postman",
    lastName: "Tester",
    mobilePhone: "2290161248277",
  },
});
```

### Completing the Charge

Initiating a transaction doesn't move any money by itself — it just prepares it. This step takes the `transaction_id` you got back from initiating the payment and actually completes the charge against the card.

```ts
const response = await cray.cards.charge({
  transaction_id: "transaction_id_from_initiate",
});
```

### Checking a Transaction's Status

Once a charge is underway, you'll often want to check where it stands — whether it succeeded, failed, or is still processing. This method looks a transaction up by either your own reference or Cray's transaction reference and tells you its current state.

```ts
const response = await cray.cards.query("merchant_reference_or_transaction_reference");
```

## Accepting Mobile Money Payments

### Starting a Mobile Money Payment

Mobile money works a little differently depending on the country and currency involved, so the fields you send vary slightly. For West and Central African currencies (XOF/XAF), you provide the customer's phone number, country, and name directly:

```ts
const response = await cray.momo.initiate({
  customer_reference: crypto.randomUUID(),
  amount: "200",
  currency: "XOF",
  phone_no: "2290161248277",
  payment_provider: "MTN",
  country: "benin",
  firstname: "Postman",
  lastname: "Tester",
});
```

For Nigerian Naira (NGN) payments, the shape is slightly different — instead of a country, you supply a `return_url` the customer is sent back to once they've completed the payment on their phone. Supported NGN providers are `opay` and `palmpay`:

```ts
const response = await cray.momo.initiate({
  customer_reference: crypto.randomUUID(),
  amount: "100",
  currency: "NGN",
  phone_no: "08012345678",
  payment_provider: "MTN",
  return_url: "https://example.com/return",
});
```

### Checking a Mobile Money Payment's Status

Mobile money payments are approved by the customer on their phone, so they don't complete instantly. Use this method to poll and find out whether a payment you started has gone through yet.

```ts
const response = await cray.momo.requery("customer_reference");
```

## Working With Wallets

### Viewing Your Balances

This gives you a live snapshot of how much money sits in your Cray wallet, broken down across the currencies you hold.

```ts
const response = await cray.wallets.balances();
```

### Listing Your Subaccounts

Subaccounts are the individual accounts Cray uses to route and settle transactions, and you'll need their IDs for other operations, like starting a card payment. This method fetches the list of subaccounts available to you so you can pick the right one.

```ts
const response = await cray.wallets.subaccounts();
```

## Converting Currencies

### Getting an Exchange Rate

Before converting money from one currency to another, you'll usually want to know what rate you'd get. This returns the current exchange rate between two specific currencies you name.

```ts
const response = await cray.fx.rates({
  source_currency: "NGN",
  destination_currency: "USD",
});
```

### Getting All Rates for a Currency

Instead of asking about one specific currency pair, this returns the rates for converting into a single destination currency from every currency Cray supports — handy if you want to show a customer their options at a glance.

```ts
const response = await cray.fx.ratesByDestination({
  destination_currency: "USD",
});
```

### Requesting a Conversion Quote

Rates can move, so before you actually convert money, you lock one in with a quote. This tells Cray how much of the source currency you want to convert and gets back a `quote_id` that holds the rate steady for a short window.

```ts
const response = await cray.fx.quote({
  source_currency: "NGN",
  destination_currency: "USD",
  source_amount: "100",
});
```

### Executing the Conversion

With a quote in hand, this is the step that actually moves the money — it takes the `quote_id` from the previous step and converts your funds at the rate that was locked in.

```ts
const response = await cray.fx.convert({
  quote_id: "quote_id_from_quote_response",
});
```

### Viewing Your Conversion History

This returns the list of currency conversions you've made, so you can review what's happened over time.

```ts
const response = await cray.fx.conversions();
```

### Disputing a Conversion

If a conversion didn't go the way it should have — it failed, timed out, or settled late — you can raise a dispute against it. The `reason` you give must be one of a fixed set of values: `failed`, `processing_timeout`, `settlement_delay`, or `other`, and you should include a clear description so the dispute can be reviewed properly.

```ts
const response = await cray.fx.disputeConversion("conversion_id", {
  reason: "other",
  description: "Dispute description with enough detail for review.",
});
```

## Sending Fiat Payouts

### Finding Available Payout Methods

Different countries support different ways of paying money out — bank transfer, mobile money, and so on. This tells you which methods are available for a given country before you attempt a payout there.

```ts
const response = await cray.payouts.paymentMethods("NG");
```

### Listing Supported Banks

To send money to a bank account, you need the receiving bank's code. This method returns the list of banks Cray supports, and you can narrow it down to a single country by passing a country code.

```ts
const response = await cray.payouts.banks("NG");
```

### Validating a Bank Account

Before sending money out, it's good practice to confirm the account you're paying into actually exists and belongs to who you think it does. This checks an account number against a bank code and returns the account holder's details for you to verify.

```ts
const response = await cray.payouts.validateAccount({
  account_number: "0123456789",
  bank_code: "044",
});
```

### Sending a Payout

This is the method that actually disburses money — it moves funds out of your Cray wallet and into the recipient's bank account, identified by the account number and bank code you provide, along with an amount, currency, and a note describing what the payment is for. For NGN payouts specifically, the backend requires `bank_code`, `account_number`, `ref_id`, `amount`, `currency`, and a unique `customer_reference` to be present.

```ts
const response = await cray.payouts.disburse({
  customer_reference: crypto.randomUUID(),
  account_number: "0123456789",
  bank_code: "044",
  ref_id: crypto.randomUUID(),
  amount: "100",
  currency: "NGN",
  narration: "SDK payout test",
});
```

### Checking a Payout's Status

Payouts can take a moment to settle on the receiving bank's side, so this lets you look up a payout by its transaction ID and see whether it's completed, failed, or still in progress.

```ts
const response = await cray.payouts.requery("transaction_id");
```

## Handling Refunds

### Issuing a Refund

When a customer needs their money back, this reverses an existing transaction. You reference the original transaction with `reference`, which is required, and can optionally specify an `amount` if you only want to refund part of the payment — but if you do include it, it must not be empty.

```ts
const response = await cray.refunds.initiate({
  reference: "original_transaction_reference",
  amount: "100",
});
```

### Checking a Refund's Status

Just like payments, refunds take a little time to process. This looks one up to tell you whether it's gone through yet.

```ts
const response = await cray.refunds.query("refund_or_transaction_reference");
```

## Managing Virtual Accounts

### Creating a Permanent Virtual Account

A virtual account gives a customer their own dedicated account number they can send money to repeatedly, and every deposit made to it is automatically attributed to them. This creates one that stays open indefinitely. For NGN permanent accounts specifically, `bvn` is required and must be exactly 11 digits. Note that the public proxy injects `merchant_id` on the backend automatically — don't send `merchant_id` yourself from SDK integrations.

```ts
const response = await cray.virtualAccounts.create({
  reference: crypto.randomUUID(),
  account_name: "Customer Wallet",
  customer_email: "customer@example.com",
  currency: "NGN",
  account_type: "Permanent",
  bvn: "12345678901",
});
```

### Creating a One-Time Virtual Account

Sometimes you only need an account number for a single payment rather than an ongoing relationship — for example, to collect one specific invoice amount. This method is intended for one-time/pre-create virtual account flows, creating a temporary account scoped to a fixed amount.

```ts
const response = await cray.virtualAccounts.initiate({
  reference: crypto.randomUUID(),
  account_name: "Temporary Customer Account",
  customer_email: "customer@example.com",
  amount: "100",
  currency: "NGN",
  account_type: "onetime",
});
```

### Listing Your Virtual Accounts

This returns every virtual account you've created so far, so you can see what's active across your customers.

```ts
const response = await cray.virtualAccounts.list();
```

### Viewing Supported Providers

Virtual accounts are issued through partner banking providers, and this tells you which providers are available to issue accounts through.

```ts
const response = await cray.virtualAccounts.providers();
```

### Verifying a Customer With an OTP

This is used for the Wema OTP wallet-generation flow: once a customer receives a one-time password, you submit it alongside their email to complete verification and generate the wallet.

```ts
const response = await cray.virtualAccounts.generateWallet({
  otp: "123456",
  customer_email: "customer@example.com",
});
```

There's also a `submitOtp` method that calls the exact same endpoint — it's simply a more intuitively named alias for the method above, in case that reads more clearly at your call site.

```ts
const response = await cray.virtualAccounts.submitOtp({
  otp: "123456",
  customer_email: "customer@example.com",
});
```

## Using Hosted Checkout

### Creating a Checkout Session

If you'd rather not build your own payment form, Cray can host one for you. This creates a checkout session — you describe the amount, currency, which payment methods to offer (card, transfer, etc.), and the customer's details — and Cray returns a page you can redirect the customer to in order to complete payment.

```ts
const response = await cray.checkout.initialize({
  reference: crypto.randomUUID(),
  amount: "100",
  currency: "NGN",
  defaultPaymentMethod: "card",
  feeBearer: "merchant",
  customer: {
    email: "customer@example.com",
    name: "Postman Tester",
  },
  paymentMethods: ["card", "transfer"],
  callback_url: "https://example.com/webhooks/cray",
  metadata: {
    source: "sdk-docs",
  },
});
```

### Checking a Checkout Session's Status

Once a customer has been sent to a checkout page, use this to look up what happened — whether they completed payment, abandoned it, or it's still pending.

```ts
const response = await cray.checkout.query("checkout_reference");
```

## Collecting Crypto Payments

### Viewing Supported Assets

Before setting up a crypto vault, it helps to know which cryptocurrencies Cray can currently collect. This returns that list.

```ts
const response = await cray.crypto.supportedAssets();
```

### Creating a Collection Vault

A vault is a dedicated crypto address for receiving a specific asset, similar in spirit to a virtual account for fiat. This creates one for a given asset (like USDT), giving you a name and profile to organize it under. As with virtual accounts, the public proxy injects `merchant_id` automatically, so don't send it yourself.

```ts
const response = await cray.crypto.createVault({
  name: "Customer USDT Vault",
  assetId: "USDT",
  profile: "default",
});
```

## Sending Crypto Payouts

### Viewing Supported Assets for Payouts

Just as with collection, it's worth checking which crypto assets can be paid out before you try to send one.

```ts
const response = await cray.cryptoPayouts.supportedAssets();
```

### Adding a Payout Beneficiary

Before you can send crypto to someone, you register their wallet as a beneficiary — giving it a name and reference so you can send to it repeatedly without re-entering the wallet address every time.

```ts
const response = await cray.cryptoPayouts.addBeneficiary({
  name: "Customer Wallet",
  customer_ref_id: "customer_wallet_reference",
  asset: "USDT",
  wallet_address: "0x0000000000000000000000000000000000000000",
  profile: "default",
});
```

### Sending a Crypto Payout

With a beneficiary registered, this actually sends the crypto payout — referencing the beneficiary you added, along with the amount, currency, and a narration describing the payment. Only `USDT` and `BTC_TEST` are currently allowed as `currency` values.

```ts
const response = await cray.cryptoPayouts.initiatePayout({
  customer_reference: crypto.randomUUID(),
  address_reference: "customer_wallet_reference",
  currency: "USDT",
  amount: "10",
  narration: "SDK crypto payout test",
});
```

## Recovering From Failed Payout Webhooks

### Viewing Failed Webhook Notifications

When Cray tries to notify your system about a payout event and the delivery fails (say, your server was down), it keeps a record. This method lists those failed webhook deliveries so you know what notifications you might have missed.

```ts
const response = await cray.webhooks.failedPayoutWebhooks();
```

### Retrying a Failed Webhook

Once you've fixed whatever caused the delivery to fail, use this to ask Cray to resend a specific webhook, identified by its ID, so your system gets the notification it missed.

```ts
const response = await cray.webhooks.retryFailedPayoutWebhook("webhook_id");
```

Our .NET SDK is built for C# and .NET developers who want to integrate Cray APIs into enterprise-grade applications. It provides strongly-typed models, consistent abstractions, and broad compatibility across .NET environments, making it a solid choice for secure, scalable financial systems and business applications.

[View on NuGet →](https://www.nuget.org/packages/CrayFi.Sdk/#readme-body-tab)

Like the other SDKs, this is a thin wrapper around Cray's payment gateway: it handles authentication, request formatting, and error handling for you, so your application code just awaits a C# method instead of hand-building HTTP requests. It covers the same ground across the platform — cards, mobile money, wallets, currency conversion, payouts, refunds, virtual accounts, hosted checkout, and crypto — all through one client. The library targets `netstandard2.0`, so it runs on both .NET Framework and modern .NET.

## Getting Started

The package is published to NuGet under the id `CrayFi.Sdk`. Install it with the .NET CLI like any other package.

```bash
dotnet add package CrayFi.Sdk
```

## How Configuration Works

Unlike some of the other SDKs, the .NET client doesn't read from environment variables on its own — you pass the gateway URL and your API key directly when you construct it. Which URL you use determines whether you're testing safely or moving real money:

| Environment | Base URL |
| --- | --- |
| Sandbox/dev | `http://sandbox.crayfi.io/` |
| Live | `https://pay.crayfi.io/` |

## Setting Up the Client

Everything starts with creating a `CrayClient`, which remembers the base URL and key you give it so you don't have to repeat them on every call. You typically keep the key itself in configuration or a secret manager and just wire it into the constructor:

```csharp
using Cray;

var client = new CrayClient(
    "http://sandbox.crayfi.io/",
    "<your_api_key>"
);
```

Whichever environment you point it at, every request the client sends carries the same three headers behind the scenes, proving who you are and what format you're speaking:

```http
Authorization: Bearer 
Accept: application/json
Content-Type: application/json
```

## How Errors Work

Rather than throwing one generic error for everything that can go wrong, the SDK throws a specific exception type depending on what actually happened, so you can catch and handle each situation differently:

| Exception | Meaning |
| --- | --- |
| `AuthenticationException` | API returned `401` |
| `ValidationException` | API returned `400` or `422` |
| `RequestException` | Non-success API response |
| `CrayException` | Network or base SDK error |

In practice, you wrap a call in a try/catch and check which exception type came back — a `ValidationException`, for example, means the request itself was malformed and worth surfacing back to the caller:

```csharp
using Cray;
using Cray.Exceptions;

try
{
    var client = new CrayClient("http://sandbox.crayfi.io/", apiKey);
    var response = await client.Wallets.Balance();
}
catch (ValidationException ex)
{
    Console.WriteLine(ex.Message);
}
```

Every service method on the client follows the same shape, too — each one returns `Task<object>`, so no matter which endpoint you're calling, you `await` it and get back the raw response data the same way.

## Accepting Card Payments

### Starting a Card Transaction

This is how you begin charging a customer's card. Before calling it, you need a real `subaccount_id` — fetch one first with the wallets method described further down, since the gateway will reject the request without a valid subaccount attached to it. Once you have that, you pass along the transaction amount, the card details, and the customer's information, and the SDK sends it all to Cray to kick off the payment.

```csharp
var response = await client.Cards.Initiate(new
{
    reference = Guid.NewGuid().ToString(),
    subaccount_id = "subaccount_id_from_wallets_subaccounts",
    amount = "100",
    currency = "NGN",
    callback_url = "https://example.com/webhooks/cray",
    card_data = new
    {
        pan = "5399832641760090",
        cvv = "146",
        expiryMonth = "05",
        expiryYear = "50"
    },
    customer_information = new
    {
        email = "customer@example.com",
        firstName = "Postman",
        lastName = "Tester",
        mobilePhone = "2290161248277"
    }
});
```

### Completing the Charge

Initiating a transaction doesn't move any money by itself — it just prepares it. This step takes the `transaction_id` you got back from initiating the payment and actually completes the charge against the card.

```csharp
var response = await client.Cards.Charge(new
{
    transaction_id = "transaction_id_from_initiate"
});
```

### Checking a Transaction's Status

Once a charge is underway, you'll often want to check where it stands — whether it succeeded, failed, or is still processing. This method looks a transaction up by either your own reference or Cray's transaction reference and tells you its current state.

```csharp
var response = await client.Cards.Query("merchant_reference_or_transaction_reference");
```

## Accepting Mobile Money Payments

### Starting a Mobile Money Payment

Mobile money works a little differently depending on the country and currency involved, so the fields you send vary slightly. For West and Central African currencies (XOF/XAF), you provide the customer's phone number, country, and name directly:

```csharp
var response = await client.MoMo.Initiate(new
{
    customer_reference = Guid.NewGuid().ToString(),
    amount = "200",
    currency = "XOF",
    phone_no = "2290161248277",
    payment_provider = "MTN",
    country = "benin",
    firstname = "Postman",
    lastname = "Tester"
});
```

For Nigerian Naira (NGN) payments, the shape is slightly different — instead of a country, you supply a `return_url` the customer is sent back to once they've completed the payment on their phone:

```csharp
var response = await client.MoMo.Initiate(new
{
    customer_reference = Guid.NewGuid().ToString(),
    amount = "100",
    currency = "NGN",
    phone_no = "08012345678",
    payment_provider = "MTN",
    return_url = "https://example.com/return"
});
```

### Checking a Mobile Money Payment's Status

Mobile money payments are approved by the customer on their phone, so they don't complete instantly. Use this method to poll and find out whether a payment you started has gone through yet.

```csharp
var response = await client.MoMo.Requery("customer_reference");
```

## Working With Wallets

### Viewing Your Balance

This gives you a live snapshot of how much money sits in your Cray wallet, broken down across the currencies you hold.

```csharp
var response = await client.Wallets.Balance();
```

### Listing Your Subaccounts

Subaccounts are the individual accounts Cray uses to route and settle transactions, and you'll need their IDs for other operations, like starting a card payment. This method fetches the list of subaccounts available to you so you can pick the right one.

```csharp
var response = await client.Wallets.Subaccounts();
```

## Converting Currencies

### Getting an Exchange Rate

Before converting money from one currency to another, you'll usually want to know what rate you'd get. This returns the current exchange rate between two specific currencies you name.

```csharp
var response = await client.FX.Rate(new
{
    source_currency = "NGN",
    destination_currency = "USD"
});
```

### Getting All Rates for a Currency

Instead of asking about one specific currency pair, this returns the rates for converting into a single destination currency from every currency Cray supports — handy if you want to show a customer their options at a glance.

```csharp
var response = await client.FX.RatesByDestination(new
{
    destination_currency = "USD"
});
```

### Requesting a Conversion Quote

Rates can move, so before you actually convert money, you lock one in with a quote. This tells Cray how much of the source currency you want to convert and gets back a `quote_id` that holds the rate steady for a short window.

```csharp
var response = await client.FX.Quote(new
{
    source_currency = "NGN",
    destination_currency = "USD",
    source_amount = "100"
});
```

### Executing the Conversion

With a quote in hand, this is the step that actually moves the money — it takes the `quote_id` from the previous step and converts your funds at the rate that was locked in.

```csharp
var response = await client.FX.Convert(new
{
    quote_id = "quote_id_from_quote_response"
});
```

### Viewing Your Conversion History

This returns the list of currency conversions you've made, so you can review what's happened over time.

```csharp
var response = await client.FX.History();
```

### Disputing a Conversion

If a conversion didn't go the way it should have — it failed, timed out, or settled late — you can raise a dispute against it. The `reason` you give must be one of a fixed set of values: `failed`, `processing_timeout`, `settlement_delay`, or `other`, and you should include a clear description so the dispute can be reviewed properly.

```csharp
var response = await client.FX.DisputeConversion("conversion_id", new
{
    reason = "other",
    description = "Dispute description with enough detail for review."
});
```

## Sending Fiat Payouts

### Finding Available Payout Methods

Different countries support different ways of paying money out — bank transfer, mobile money, and so on. This tells you which methods are available for a given country before you attempt a payout there.

```csharp
var response = await client.Payouts.PaymentMethods("NG");
```

### Listing Supported Banks

To send money to a bank account, you need the receiving bank's code. This method returns the list of banks Cray supports, and you can narrow it down to a single country by passing a country code, or leave it as `null` to see all of them.

```csharp
var response = await client.Payouts.Banks("NG");
```

### Validating a Bank Account

Before sending money out, it's good practice to confirm the account you're paying into actually exists and belongs to who you think it does. This checks an account number against a bank code and returns the account holder's details for you to verify.

```csharp
var response = await client.Payouts.ValidateAccount(new
{
    account_number = "0123456789",
    bank_code = "044"
});
```

### Sending a Payout

This is the method that actually disburses money — it moves funds out of your Cray wallet and into the recipient's bank account, identified by the account number and bank code you provide, along with an amount, currency, and a note describing what the payment is for.

```csharp
var response = await client.Payouts.Disburse(new
{
    customer_reference = Guid.NewGuid().ToString(),
    account_number = "0123456789",
    bank_code = "044",
    ref_id = Guid.NewGuid().ToString(),
    amount = "100",
    currency = "NGN",
    narration = "SDK payout test"
});
```

### Checking a Payout's Status

Payouts can take a moment to settle on the receiving bank's side, so this lets you look up a payout by its transaction ID and see whether it's completed, failed, or still in progress.

```csharp
var response = await client.Payouts.Verify("transaction_id");
```

## Handling Refunds

### Issuing a Refund

When a customer needs their money back, this reverses an existing transaction. You reference the original transaction and specify how much of it to refund, which is useful if you only want to refund part of a payment.

```csharp
var response = await client.Refunds.Initiate(new
{
    reference = "original_transaction_reference",
    amount = "100"
});
```

### Checking a Refund's Status

Just like payments, refunds take a little time to process. This looks one up to tell you whether it's gone through yet.

```csharp
var response = await client.Refunds.Query("refund_or_transaction_reference");
```

## Managing Virtual Accounts

### Creating a Permanent Virtual Account

A virtual account gives a customer their own dedicated account number they can send money to repeatedly, and every deposit made to it is automatically attributed to them. This creates one that stays open indefinitely, tied to the customer's name, email, and (where required) their BVN for verification.

```csharp
var response = await client.VirtualAccounts.Create(new
{
    reference = Guid.NewGuid().ToString(),
    account_name = "Customer Wallet",
    customer_email = "customer@example.com",
    currency = "NGN",
    account_type = "Permanent",
    bvn = "12345678901"
});
```

### Creating a One-Time Virtual Account

Sometimes you only need an account number for a single payment rather than an ongoing relationship — for example, to collect one specific invoice amount. This creates a temporary account scoped to a fixed amount, which closes once the payment is made.

```csharp
var response = await client.VirtualAccounts.Initiate(new
{
    reference = Guid.NewGuid().ToString(),
    account_name = "Temporary Customer Account",
    customer_email = "customer@example.com",
    amount = "100",
    currency = "NGN",
    account_type = "onetime"
});
```

### Listing Your Virtual Accounts

This returns every virtual account you've created so far, so you can see what's active across your customers.

```csharp
var response = await client.VirtualAccounts.List();
```

### Viewing Supported Providers

Virtual accounts are issued through partner banking providers, and this tells you which providers are available to issue accounts through.

```csharp
var response = await client.VirtualAccounts.Providers();
```

### Verifying a Customer With an OTP

For certain virtual account flows, the customer needs to confirm their identity with a one-time password sent to them before the wallet is generated. This submits that OTP alongside the customer's email to complete the verification and generate the wallet.

```csharp
var response = await client.VirtualAccounts.GenerateWallet(new
{
    otp = "123456",
    customer_email = "customer@example.com"
});
```

There's also a `SubmitOtp` method that does exactly the same thing — it's simply a more intuitively named alias for the method above, in case that reads more clearly at your call site.

```csharp
var response = await client.VirtualAccounts.SubmitOtp(new
{
    otp = "123456",
    customer_email = "customer@example.com"
});
```

## Using Hosted Checkout

### Creating a Checkout Session

If you'd rather not build your own payment form, Cray can host one for you. This creates a checkout session — you describe the amount, currency, which payment methods to offer (card, transfer, etc.), and the customer's details — and Cray returns a page you can redirect the customer to in order to complete payment.

```csharp
var response = await client.Checkout.Initialize(new
{
    reference = Guid.NewGuid().ToString(),
    amount = "100",
    currency = "NGN",
    defaultPaymentMethod = "card",
    feeBearer = "merchant",
    customer = new
    {
        email = "customer@example.com",
        name = "Postman Tester"
    },
    paymentMethods = new[] { "card", "transfer" },
    callback_url = "https://example.com/webhooks/cray",
    metadata = new
    {
        source = "sdk-docs"
    }
});
```

### Checking a Checkout Session's Status

Once a customer has been sent to a checkout page, use this to look up what happened — whether they completed payment, abandoned it, or it's still pending.

```csharp
var response = await client.Checkout.Query("checkout_reference");
```

## Collecting Crypto Payments

### Viewing Supported Assets

Before setting up a crypto vault, it helps to know which cryptocurrencies Cray can currently collect. This returns that list.

```csharp
var response = await client.Crypto.SupportedAssets();
```

### Creating a Collection Vault

A vault is a dedicated crypto address for receiving a specific asset, similar in spirit to a virtual account for fiat. This creates one for a given asset (like USDT), giving you a name and profile to organize it under.

```csharp
var response = await client.Crypto.CreateVault(new
{
    name = "Customer USDT Vault",
    assetId = "USDT",
    profile = "default"
});
```

## Sending Crypto Payouts

### Viewing Supported Assets for Payouts

Just as with collection, it's worth checking which crypto assets can be paid out before you try to send one.

```csharp
var response = await client.CryptoPayouts.SupportedAssets();
```

### Adding a Payout Beneficiary

Before you can send crypto to someone, you register their wallet as a beneficiary — giving it a name and reference so you can send to it repeatedly without re-entering the wallet address every time.

```csharp
var response = await client.CryptoPayouts.AddBeneficiary(new
{
    name = "Customer Wallet",
    customer_ref_id = "customer_wallet_reference",
    asset = "USDT",
    wallet_address = "0x0000000000000000000000000000000000000000",
    profile = "default"
});
```

### Sending a Crypto Payout

With a beneficiary registered, this actually sends the crypto payout — referencing the beneficiary you added, along with the amount, currency, and a narration describing the payment. Only `USDT` and `BTC_TEST` are currently allowed as `currency` values.

```csharp
var response = await client.CryptoPayouts.InitiatePayout(new
{
    customer_reference = Guid.NewGuid().ToString(),
    address_reference = "customer_wallet_reference",
    currency = "USDT",
    amount = "10",
    narration = "SDK crypto payout test"
});
```

## Recovering From Failed Payout Webhooks

### Viewing Failed Webhook Notifications

When Cray tries to notify your system about a payout event and the delivery fails (say, your server was down), it keeps a record. This method lists those failed webhook deliveries so you know what notifications you might have missed.

```csharp
var response = await client.Webhooks.FailedPayoutWebhooks();
```

### Retrying a Failed Webhook

Once you've fixed whatever caused the delivery to fail, use this to ask Cray to resend a specific webhook, identified by its ID, so your system gets the notification it missed.

```csharp
var response = await client.Webhooks.RetryFailedPayoutWebhook("webhook_id");
```

Our Laravel SDK brings Cray's payment infrastructure directly into your Laravel application. It provides Eloquent-friendly interfaces, service providers, and facade support, making it easy to integrate payments, wallets, and financial workflows into your Laravel projects with minimal boilerplate.

[View on Packagist →](https://packagist.org/packages/crayfi/cray-laravel)

Under the hood, this is a thin wrapper around Cray's payment gateway, packaged the Laravel way — a service provider, a facade, and a publishable config file — so it feels like a natural part of your app instead of a bolted-on API client. It covers the same ground as the other SDKs: cards, mobile money, wallets, currency conversion, payouts, refunds, virtual accounts, hosted checkout, and crypto.

## Getting Started

The package is published on Packagist as `crayfi/cray-laravel`. Install it with Composer, and Laravel's package discovery takes care of registering the service provider and facade for you automatically — no manual wiring needed in most apps.

```bash
composer require crayfi/cray-laravel
```

If your app has package discovery disabled, you'll need to register the provider yourself in `config/app.php`:

```php
'providers' => [
    Cray\Laravel\CrayServiceProvider::class,
],
```

And optionally add the facade alias, so you can call `Cray::` directly instead of resolving the class from the container:

```php
'aliases' => [
    'Cray' => Cray\Laravel\Facades\Cray::class,
],
```

## Publishing the Config File

Laravel packages typically ship their configuration as a publishable file so you can customize it inside your own app, and this SDK follows that convention. Running this command copies the package's config into your app as `config/cray.php`, where you can review or override it:

```bash
php artisan vendor:publish --tag=cray-config
```

## How Configuration Works

The SDK needs three things to talk to Cray: which API key identifies your account, which environment (sandbox or live) to send requests to, and how patient to be when a request is slow. The idiomatic Laravel way to supply these is through your `.env` file, which the published config reads from.

```env
CRAY_API_KEY=<your_api_key>
CRAY_ENV=sandbox
CRAY_BASE_URL=http://sandbox.crayfi.io
CRAY_TIMEOUT=30
CRAY_RETRIES=2
```

The environment you choose determines which server your requests actually reach — sandbox for testing with fake money, live for real transactions:

| Environment | Base URL |
| --- | --- |
| Sandbox/dev | `http://sandbox.crayfi.io` |
| Live | `https://pay.crayfi.io` |

You don't need to set `CRAY_BASE_URL` yourself in most cases — the SDK works it out for you from `CRAY_ENV`. If `CRAY_ENV` isn't set to `live`, it quietly defaults to the sandbox URL; set it to `live` and it switches to the production gateway.

## Using the SDK

Because it's a proper Laravel package, you get two equally valid ways to call it, and you can pick whichever fits the style of the code you're writing. The quickest is the facade, which reads naturally in a script or a quick controller action:

```php
use Cray\Laravel\Facades\Cray;
use Illuminate\Support\Str;

$balances = Cray::wallets()->balances();
```

If you prefer explicit dependency injection — for example, to make a class easier to test by swapping in a mock — Laravel's service container will hand you a fully configured client automatically:

```php
use Cray\Laravel\Cray;

class PaymentController
{
    public function __construct(private Cray $cray)
    {
    }

    public function balance()
    {
        return $this->cray->wallets()->balances();
    }
}
```

Whichever style you use, every request the client sends carries the same three headers behind the scenes, proving who you are and what format you're speaking:

```http
Authorization: Bearer 
Accept: application/json
Content-Type: application/json
```

## How Errors Work

Rather than surfacing raw HTTP failures, the SDK normalizes whatever comes back from the gateway and throws a specific exception type depending on what actually went wrong, so you can catch and handle each situation differently:

| Exception | Meaning |
| --- | --- |
| `CrayAuthenticationException` | Authentication failed or API returned `401` |
| `CrayValidationException` | Validation failed, usually `400` or `422` |
| `CrayTimeoutException` | Laravel HTTP client connection timeout |
| `CrayApiException` | Other API failures |

In practice, you wrap a call in a try/catch and check which exception type came back — a `CrayValidationException`, for example, carries the specific field errors returned by the API, which is exactly what you'd want to hand back to your frontend as a `422` response:

```php
use Cray\Laravel\Exceptions\CrayValidationException;
use Cray\Laravel\Facades\Cray;

try {
    $response = Cray::wallets()->balances();
} catch (CrayValidationException $e) {
    report($e);
    return response()->json([
        'message' => $e->getMessage(),
        'errors' => $e->getErrors(),
    ], 422);
}
```

## Accepting Card Payments

### Starting a Card Transaction

This is how you begin charging a customer's card. Before calling it, you need a real `subaccount_id` — fetch one first with the wallets method described further down, since the gateway will reject the request without a valid subaccount attached to it. Once you have that, you pass along the transaction amount, the card details, and the customer's information, and the SDK sends it all to Cray to kick off the payment.

```php
$response = Cray::cards()->initiate([
    'reference' => (string) Str::uuid(),
    'subaccount_id' => 'subaccount_id_from_wallets_subaccounts',
    'amount' => '100',
    'currency' => 'NGN',
    'callback_url' => 'https://example.com/webhooks/cray',
    'card_data' => [
        'pan' => '5399832641760090',
        'cvv' => '146',
        'expiryMonth' => '05',
        'expiryYear' => '50',
    ],
    'customer_information' => [
        'email' => 'customer@example.com',
        'firstName' => 'Postman',
        'lastName' => 'Tester',
        'mobilePhone' => '2290161248277',
    ],
]);
```

### Completing the Charge

Initiating a transaction doesn't move any money by itself — it just prepares it. This step takes the `transaction_id` you got back from initiating the payment and actually completes the charge against the card.

```php
$response = Cray::cards()->charge([
    'transaction_id' => 'transaction_id_from_initiate',
]);
```

### Checking a Transaction's Status

Once a charge is underway, you'll often want to check where it stands — whether it succeeded, failed, or is still processing. This method looks a transaction up by either your own reference or Cray's transaction reference and tells you its current state.

```php
$response = Cray::cards()->query('merchant_reference_or_transaction_reference');
```

## Accepting Mobile Money Payments

### Starting a Mobile Money Payment

Mobile money works a little differently depending on the country and currency involved, so the fields you send vary slightly. For West and Central African currencies (XOF/XAF), you provide the customer's phone number, country, and name directly:

```php
$response = Cray::momo()->initiate([
    'customer_reference' => (string) Str::uuid(),
    'amount' => '200',
    'currency' => 'XOF',
    'phone_no' => '2290161248277',
    'payment_provider' => 'MTN',
    'country' => 'benin',
    'firstname' => 'Postman',
    'lastname' => 'Tester',
]);
```

For Nigerian Naira (NGN) payments, the shape is slightly different — instead of a country, you supply a `return_url` the customer is sent back to once they've completed the payment on their phone:

```php
$response = Cray::momo()->initiate([
    'customer_reference' => (string) Str::uuid(),
    'amount' => '100',
    'currency' => 'NGN',
    'phone_no' => '08012345678',
    'payment_provider' => 'MTN',
    'return_url' => 'https://example.com/return',
]);
```

### Checking a Mobile Money Payment's Status

Mobile money payments are approved by the customer on their phone, so they don't complete instantly. Use this method to poll and find out whether a payment you started has gone through yet.

```php
$response = Cray::momo()->requery('customer_reference');
```

## Working With Wallets

### Viewing Your Balances

This gives you a live snapshot of how much money sits in your Cray wallet, broken down across the currencies you hold.

```php
$response = Cray::wallets()->balances();
```

### Listing Your Subaccounts

Subaccounts are the individual accounts Cray uses to route and settle transactions, and you'll need their IDs for other operations, like starting a card payment. This method fetches the list of subaccounts available to you so you can pick the right one.

```php
$response = Cray::wallets()->subaccounts();
```

## Converting Currencies

### Getting an Exchange Rate

Before converting money from one currency to another, you'll usually want to know what rate you'd get. This returns the current exchange rate between two specific currencies you name.

```php
$response = Cray::fx()->rates([
    'source_currency' => 'NGN',
    'destination_currency' => 'USD',
]);
```

### Getting All Rates for a Currency

Instead of asking about one specific currency pair, this returns the rates for converting into a single destination currency from every currency Cray supports — handy if you want to show a customer their options at a glance.

```php
$response = Cray::fx()->ratesByDestination([
    'destination_currency' => 'USD',
]);
```

### Requesting a Conversion Quote

Rates can move, so before you actually convert money, you lock one in with a quote. This tells Cray how much of the source currency you want to convert and gets back a `quote_id` that holds the rate steady for a short window.

```php
$response = Cray::fx()->quote([
    'source_currency' => 'NGN',
    'destination_currency' => 'USD',
    'source_amount' => '100',
]);
```

### Executing the Conversion

With a quote in hand, this is the step that actually moves the money — it takes the `quote_id` from the previous step and converts your funds at the rate that was locked in.

```php
$response = Cray::fx()->convert([
    'quote_id' => 'quote_id_from_quote_response',
]);
```

### Viewing Your Conversion History

This returns the list of currency conversions you've made, so you can review what's happened over time.

```php
$response = Cray::fx()->conversions();
```

### Disputing a Conversion

If a conversion didn't go the way it should have — it failed, timed out, or settled late — you can raise a dispute against it. The `reason` you give must be one of a fixed set of values: `failed`, `processing_timeout`, `settlement_delay`, or `other`, and you should include a clear description so the dispute can be reviewed properly.

```php
$response = Cray::fx()->disputeConversion('conversion_id', [
    'reason' => 'other',
    'description' => 'Dispute description with enough detail for review.',
]);
```

## Sending Fiat Payouts

### Finding Available Payout Methods

Different countries support different ways of paying money out — bank transfer, mobile money, and so on. This tells you which methods are available for a given country before you attempt a payout there.

```php
$response = Cray::payouts()->paymentMethods('NG');
```

### Listing Supported Banks

To send money to a bank account, you need the receiving bank's code. This method returns the list of banks Cray supports, and you can narrow it down to a single country by passing a country code, or leave it as `null` to see all of them.

```php
$response = Cray::payouts()->banks('NG');
```

### Validating a Bank Account

Before sending money out, it's good practice to confirm the account you're paying into actually exists and belongs to who you think it does. This checks an account number against a bank code and returns the account holder's details for you to verify.

```php
$response = Cray::payouts()->validateAccount([
    'account_number' => '0123456789',
    'bank_code' => '044',
]);
```

### Sending a Payout

This is the method that actually disburses money — it moves funds out of your Cray wallet and into the recipient's bank account, identified by the account number and bank code you provide, along with an amount, currency, and a note describing what the payment is for.

```php
$response = Cray::payouts()->disburse([
    'customer_reference' => (string) Str::uuid(),
    'account_number' => '0123456789',
    'bank_code' => '044',
    'ref_id' => (string) Str::uuid(),
    'amount' => '100',
    'currency' => 'NGN',
    'narration' => 'SDK payout test',
]);
```

### Checking a Payout's Status

Payouts can take a moment to settle on the receiving bank's side, so this lets you look up a payout by its transaction ID and see whether it's completed, failed, or still in progress.

```php
$response = Cray::payouts()->requery('transaction_id');
```

## Handling Refunds

### Issuing a Refund

When a customer needs their money back, this reverses an existing transaction. You reference the original transaction and specify how much of it to refund, which is useful if you only want to refund part of a payment.

```php
$response = Cray::refunds()->initiate([
    'reference' => 'original_transaction_reference',
    'amount' => '100',
]);
```

### Checking a Refund's Status

Just like payments, refunds take a little time to process. This looks one up to tell you whether it's gone through yet.

```php
$response = Cray::refunds()->query('refund_or_transaction_reference');
```

## Managing Virtual Accounts

### Creating a Permanent Virtual Account

A virtual account gives a customer their own dedicated account number they can send money to repeatedly, and every deposit made to it is automatically attributed to them. This creates one that stays open indefinitely. For NGN permanent accounts specifically, `bvn` is required and must be exactly 11 digits. Note that the public proxy injects `merchant_id` on the backend automatically — don't send `merchant_id` yourself.

```php
$response = Cray::virtualAccounts()->create([
    'reference' => (string) Str::uuid(),
    'account_name' => 'Customer Wallet',
    'customer_email' => 'customer@example.com',
    'currency' => 'NGN',
    'account_type' => 'Permanent',
    'bvn' => '12345678901',
]);
```

### Creating a One-Time Virtual Account

Sometimes you only need an account number for a single payment rather than an ongoing relationship — for example, to collect one specific invoice amount. This creates a temporary account scoped to a fixed amount, which closes once the payment is made.

```php
$response = Cray::virtualAccounts()->initiate([
    'reference' => (string) Str::uuid(),
    'account_name' => 'Temporary Customer Account',
    'customer_email' => 'customer@example.com',
    'amount' => '100',
    'currency' => 'NGN',
    'account_type' => 'onetime',
]);
```

### Listing Your Virtual Accounts

This returns every virtual account you've created so far, so you can see what's active across your customers.

```php
$response = Cray::virtualAccounts()->list();
```

### Viewing Supported Providers

Virtual accounts are issued through partner banking providers, and this tells you which providers are available to issue accounts through.

```php
$response = Cray::virtualAccounts()->providers();
```

### Verifying a Customer With an OTP

This is used for the Wema OTP wallet-generation flow: once a customer receives a one-time password, you submit it alongside their email to complete verification and generate the wallet.

```php
$response = Cray::virtualAccounts()->generateWallet([
    'otp' => '123456',
    'customer_email' => 'customer@example.com',
]);
```

There's also a `submitOtp` method that calls the exact same underlying logic — it's simply a more intuitively named alias for the method above, in case that reads more clearly at your call site.

```php
$response = Cray::virtualAccounts()->submitOtp([
    'otp' => '123456',
    'customer_email' => 'customer@example.com',
]);
```

## Using Hosted Checkout

### Creating a Checkout Session

If you'd rather not build your own payment form, Cray can host one for you. This creates a checkout session — you describe the amount, currency, which payment methods to offer (card, transfer, etc.), and the customer's details — and Cray returns a page you can redirect the customer to in order to complete payment.

```php
$response = Cray::checkout()->initialize([
    'reference' => (string) Str::uuid(),
    'amount' => '100',
    'currency' => 'NGN',
    'defaultPaymentMethod' => 'card',
    'feeBearer' => 'merchant',
    'customer' => [
        'email' => 'customer@example.com',
        'name' => 'Postman Tester',
    ],
    'paymentMethods' => ['card', 'transfer'],
    'callback_url' => 'https://example.com/webhooks/cray',
    'metadata' => [
        'source' => 'sdk-docs',
    ],
]);
```

### Checking a Checkout Session's Status

Once a customer has been sent to a checkout page, use this to look up what happened — whether they completed payment, abandoned it, or it's still pending.

```php
$response = Cray::checkout()->query('checkout_reference');
```

## Collecting Crypto Payments

### Viewing Supported Assets

Before setting up a crypto vault, it helps to know which cryptocurrencies Cray can currently collect. This returns that list.

```php
$response = Cray::crypto()->supportedAssets();
```

### Creating a Collection Vault

A vault is a dedicated crypto address for receiving a specific asset, similar in spirit to a virtual account for fiat. This creates one for a given asset (like USDT), giving you a name and profile to organize it under.

```php
$response = Cray::crypto()->createVault([
    'name' => 'Customer USDT Vault',
    'assetId' => 'USDT',
    'profile' => 'default',
]);
```

## Sending Crypto Payouts

### Viewing Supported Assets for Payouts

Just as with collection, it's worth checking which crypto assets can be paid out before you try to send one.

```php
$response = Cray::cryptoPayouts()->supportedAssets();
```

### Adding a Payout Beneficiary

Before you can send crypto to someone, you register their wallet as a beneficiary — giving it a name and reference so you can send to it repeatedly without re-entering the wallet address every time.

```php
$response = Cray::cryptoPayouts()->addBeneficiary([
    'name' => 'Customer Wallet',
    'customer_ref_id' => 'customer_wallet_reference',
    'asset' => 'USDT',
    'wallet_address' => '0x0000000000000000000000000000000000000000',
    'profile' => 'default',
]);
```

### Sending a Crypto Payout

With a beneficiary registered, this actually sends the crypto payout — referencing the beneficiary you added, along with the amount, currency, and a narration describing the payment. Only `USDT` and `BTC_TEST` are currently allowed as `currency` values.

```php
$response = Cray::cryptoPayouts()->initiatePayout([
    'customer_reference' => (string) Str::uuid(),
    'address_reference' => 'customer_wallet_reference',
    'currency' => 'USDT',
    'amount' => '10',
    'narration' => 'SDK crypto payout test',
]);
```

## Recovering From Failed Payout Webhooks

### Viewing Failed Webhook Notifications

When Cray tries to notify your system about a payout event and the delivery fails (say, your server was down), it keeps a record. This method lists those failed webhook deliveries so you know what notifications you might have missed.

```php
$response = Cray::webhooks()->failedPayoutWebhooks();
```

### Retrying a Failed Webhook

Once you've fixed whatever caused the delivery to fail, use this to ask Cray to resend a specific webhook, identified by its ID, so your system gets the notification it missed.

```php
$response = Cray::webhooks()->retryFailedPayoutWebhook('webhook_id');
```

---

## Cray Woocommerce Payment Plugin

URL: https://docs.crayfi.com/v2/cray-docs/plugins

E-commerce plugins for integrating Cray payments into your online store.

The official **Cray Payments** plugin for WooCommerce allows you to accept payments on your WordPress store using Cray's secure payment infrastructure.

[Download WooCommerce Plugin (.zip)](/downloads/cray-woocommerce-gateway-v1.1.3.zip)

## Features

* **Card Payments** — Accept Visa, Mastercard, and Verve cards securely.
* **Mobile Money (MoMo)** — Support for mobile money payments across multiple African countries (Nigeria, Ghana, Kenya, etc.).
* **3D Secure** — Full support for 3D Secure (3DS) authentication to prevent fraud.
* **Webhooks** — Automatic order status updates via webhooks.
* **Subaccounts** — Support for splitting payments to subaccounts.
* **Secure** — Sensitive card data is never stored on your server.

## Installation & Setup

### Step 1: Install the Plugin

1. Download the plugin zip file.
2. Log in to your WordPress Admin Dashboard.
3. Go to **Plugins** > **Add New**.
4. Click **Upload Plugin** at the top.
5. Choose the zip file you downloaded and click **Install Now**.
6. After installation, click **Activate**.

### Step 2: Enable the Payment Gateway

1. Go to **WooCommerce** > **Settings**.
2. Click on the **Payments** tab.
3. Find **Cray Payments** and toggle the switch to **Enable**.
4. Click **Manage** (or "Set up") next to Cray Payments to configure your settings.

### Step 3: Configure API Keys

You need your API keys from your Cray Dashboard.

1. **Environment** — Select `Sandbox` for testing or `Live` for real payments.
2. **Public Key** — Enter your Cray Public Key.
3. **Secret Key** — Enter your Cray Secret Key.
4. **Default Currency** — Select the currency you want to process payments in (e.g., USD, NGN).
5. Click **Save Changes**.

### Step 4: Configure Webhooks

> **info:** Webhooks allow Cray to notify your store when a payment is successful, ensuring orders are updated even if the user closes their browser.

1. In the plugin settings page, look for the **Webhook Endpoint** field.
2. Copy the URL (e.g., `https://yourstore.com/wp-json/cray/v1/webhook`).
3. Log in to your **Cray Dashboard**.
4. Navigate to **Settings** > **Webhooks**.
5. Paste the URL and save.

## Payment Methods

You can choose which payment methods to display on checkout by going to the main Cray settings page (usually under a "Cray Payments" submenu or the main plugin settings).

* **Card Only** — Show only the credit/debit card form.
* **MoMo Only** — Show only the Mobile Money option.
* **Both** — Allow customers to choose between Card and MoMo.

## Testing (Sandbox Mode)

1. Ensure **Environment** is set to `Sandbox` in the plugin settings.
2. Use the test cards provided in the Cray documentation to simulate successful and failed transactions.
3. Check the **WooCommerce > Status > Logs** (select `cray-woocommerce-gateway` from the dropdown) to debug any issues.

## Frequently Asked Questions

**Q: Where can I find my API Keys?**
Log in to your Cray Dashboard and navigate to the Developer/API Settings section.

**Q: My orders are not updating to "Processing" after payment.**
Ensure you have configured the **Webhook URL** correctly in your Cray Dashboard (see Step 4).

**Q: Is this plugin secure?**
Yes. Card details are tokenized and processed securely by Cray. We do not store sensitive card information (PAN, CVV) on your server.

## Support

If you encounter any issues, please check the logs in **WooCommerce > Status > Logs** or contact Cray support.

---

# Wallet

## Cray wallets

URL: https://docs.crayfi.com/v2/wallet

**Endpoint access**
**Scope:** none required — an API key with the `collection`, `disbursement` or `conversion` scope can call this endpoint. A `webhook` key cannot. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Learn about Cray wallets and multi-currency wallet management

Cray Wallets are digital accounts that allow your application to track and display balances in multiple African currencies. Currently, Cray supports the following currencies:
            

* **NGN**: Nigeria
* **GHS**: Ghana
* **KES**: Kenya
* **ZMW**: Zambia
* **XOF**: West African CFA (Benin, Ivory Coast, Togo, Burkina Faso, Senegal)
* **USD**: United States
* **MZN**: Mozambique
* **XAF**: Central African CFA (Cameroon)
* **ZAR**: South Africa

### Key points about Cray Wallets

1. **Balance Display Only**
   * Wallets reflect the available balance in each supported currency. 
   * They do **not automatically convert** between currencies; each wallet balance is tied to a specific currency.

2. **Multi-Currency Support**
   * You can create separate wallets for different currencies if your users or organization operate across multiple regions.
   * The API returns balances in the currency associated with each wallet.

3. **Read & Track Balances via API**
   * Use the Cray Wallets API to retrieve balances.
   * Wallets provide a clear, real-time view of funds available per currency.

4. **Integration with Cray Products**
   * Wallets can be linked to transfers, payouts, and cards.
   * They act as a single point of reference for all your multi-currency financial operations within Cray.

| Method | URL | Description |
| ------ | --- | ----------- |
| GET | /balance | Get wallet balance |

**Request parameter:**

| Parameter | Description | Value |
| --------- | ----------- | ----- |
| Currency | Filter accounts by currency code | NGN, USD, GHS |

**Example request:**

```bash
curl --location -g '{{base_url}}/balance?currency=NGN' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

  
    ```json
    {
        "status": "success",
        "message": "Account balance retrieved successfully",
        "data": {
            "accounts": [
                {
                    "id": "account-uuid-1",
                    "account_name": "Main Account",
                    "currency": "NGN",
                    "account_type": "SAVINGS",
                    "account_number": "1234567890",
                    "available_balance": 50000.00,
                    "locked_balance": 5000.00,
                    "actual_balance": 55000.00
                },
                {
                    "id": "account-uuid-2",
                    "account_name": "USD Account",
                    "currency": "USD",
                    "account_type": "CURRENT",
                    "account_number": "0987654321",
                    "available_balance": 1000.00,
                    "locked_balance": 0.00,
                    "actual_balance": 1000.00
                }
            ]
        }
    }
    ```
  
  
    ```json
    {
        "status": "success",
        "message": "No accounts found",
        "data": []
    }
    ```
  
  
    ```json
    {
        "status": false,
        "message": "Unable to fetch account balance at this time, please try again",
        "error": []
    }
    ```

---

## Get Wallet Balance

URL: https://docs.crayfi.com/v2/wallet/get-balance

Method: `GET`

Endpoint: `GET {{base_url}}/balance`

**Endpoint access**
**Scope:** none required — an API key with the `collection`, `disbursement` or `conversion` scope can call this endpoint. A `webhook` key cannot. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Track and display Cray wallet balances in multiple currencies



---

# Collections

## Collections overview

URL: https://docs.crayfi.com/v2/collections

Cray Collections provide a suite of tools to help your business accept and reconcile payments efficiently. Whether you are receiving funds via bank transfers, card payments, or mobile wallets, the Collections API enables you to automate the entire process, reduce manual effort, and maintain accurate financial records.

Through our multi-channel approach, you can:

* Accept payments from a wide variety of sources
* Automate reconciliation for faster processing
* Provide a seamless experience for your customers

### Supported Collection Currencies

Our platform supports collections in the following currencies:

* **NGN**: Nigeria
* **GHS**: Ghana
* **KES**: Kenya
* **ZMW**: Zambia
* **XOF**: West African CFA (Benin, Ivory Coast, Togo, Burkina Faso, Senegal)
* **USD**: United States
* **MZN**: Mozambique
* **XAF**: Central African CFA (Cameroon)
* **ZAR**: South Africa

Cray Collections currently include three main services: **Virtual Accounts, Card Processing, and Mobile Money**.

## 1. Virtual Accounts

Cray Virtual Accounts let you generate **dedicated account numbers** for your customers or transactions, streamlining both collections and reconciliation.

**Benefits:**

* **Easy Customer Payments** – Customers pay directly to a unique account number without extra steps.
* **Automated Reconciliation** – Each account is tied to a customer or invoice, allowing instant matching of incoming payments.
* **Flexible Account Types** – Create **Permanent Accounts** for ongoing use or **Temporary Accounts** for one-time collections.

## 2. Card Processing

Cray Card Processing allows you to **handle all payment card transactions securely** through the API, supporting multiple card types and standard verification methods.

**Benefits:**

* **End-to-End Card Management** – From validation and authorization to processing and settlement.
* **Detailed Transaction Data** – Access transaction results and use webhooks for real-time updates.
* **Simplified Reconciliation** – Transaction metadata allows for automated matching and reporting.

## 3. Mobile Money

Mobile Money (MoMo) enables payments directly from **mobile wallets**, making it ideal for Africa and other emerging markets.

**Benefits:**

* **Wide User Reach** – Tap into mobile wallet users who prefer cashless mobile payments. Cray Mobile Money integration is available in KES, NGN, GHS, ZMW, XOF
* **Secure & Convenient** – Transactions are fast, reliable, and integrated into your app.
* **Seamless Integration** – Collect payments seamlessly through the API.

---

## Virtual accounts

URL: https://docs.crayfi.com/v2/collections/virtual-accounts

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Cray Virtual Accounts offer dedicated accounts for easy collection and reconciliation.

Cray Virtual Accounts provide a powerful tool for streamlining your collections and reconciliation process. By generating a dedicated virtual account number for each customer or transaction, you can enable them to receive payments directly via bank transfer.

This allows for:

* **Easy Customer Payments:** Customers simply transfer funds to a unique account number.
* **Automated Reconciliation:** Since each account is tied to a specific entity or reference, your system can instantly and accurately link the incoming payment to the correct customer or invoice, eliminating manual tracking.

We support the creation of both **Permanent** (tied to a customer for continuous use) and **One-time** (for a single payment of a set amount) virtual accounts, on **Bloc** (the default provider) and **PalmPay**.

### Create virtual account:

  

  

Bloc is the default provider for NGN virtual accounts, and PalmPay is also available. Both use the same endpoint: the payload decides the provider and whether the account is permanent or one-time.

| Method | URL | Description |
|--------|-----|-------------|
| POST | /virtual-accounts/create | Creates a permanent or one-time NGN virtual account. |

### Bloc: permanent account

A permanent account is tied to one customer and receives repeated payments.

**Request body payload:**

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| type | Yes | Type of account holder. Use `individual`. | "individual" |
| virtual_account_type | Yes | `Permanent` for a long-term customer account. | "Permanent" |
| currency | Yes | The currency for the virtual account. Currently `NGN`. | "NGN" |
| provider | Yes | `Bloc`. | "Bloc" |
| account_name | Yes | The name to give the account. The name in the response can carry a prefix for your business, so always show the customer the returned `account_name`. | "Prin Test" |
| customer_email | Yes | The customer's email address. | "pess@example.com" |
| reference | Yes | A unique identifier you generate for this request, such as a UUID. Reuse it only to retry the same request. | "6085d877-5fc4-4795-95fa-d948bc68d544" |
| first_name | No | The customer's first name. | "Prin" |
| last_name | No | The customer's last name. | "Test" |
| other_name | No | The customer's middle or other name. | "Ade" |
| date_of_birth | No | The customer's date of birth, `YYYY-MM-DD`. | "1982-10-23" |

**Example request:**

```bash
curl --location -g '{{base_url}}/virtual-accounts/create' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data-raw '{
  "type": "individual",
  "virtual_account_type": "Permanent",
  "currency": "NGN",
  "provider": "Bloc",
  "account_name": "Prin Test",
  "customer_email": "pess@example.com",
  "reference": "6085d877-5fc4-4795-95fa-d948bc68d544",
  "first_name": "Prin",
  "last_name": "Test",
  "date_of_birth": "1982-10-23"
}'
```

**Example response:**

```json
{
  "success": true,
  "message": "Action was Succesful",
  "data": {
    "id": "cf91250f-0704-4836-97a5-ac5e7aa97997",
    "sort_code": "51411",
    "bank": "Bloc MFB",
    "account_name": "GEVS-Prin Test",
    "account_number": "1000008381",
    "cba_account_id": "838",
    "parent_id": "4012326f-55d3-4958-bd7d-98d2e504eb3b",
    "validity_type": "Permanent",
    "created_at": "2026-10-29T13:49:11.196943206Z"
  }
}
```

### Bloc: one-time account

A one-time account collects a single payment of a set amount and expires after a short time. If you leave out `provider`, the account is created on Bloc.

**Request body payload:**

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| account_type | Yes | `onetime`. | "onetime" |
| currency | Yes | Currently `NGN`. | "NGN" |
| amount | Yes | The amount to collect, in naira. | 100 |
| account_name | Yes | A name for the payment. The response may return a different name, so always show the customer the returned `account_name`. | "Elohor" |
| provider | No | `Bloc`. This is the default. | "Bloc" |
| reference | No | A unique identifier you generate for this payment, such as a UUID. | "9ad98621-6763-491f-9a02-e0aa0d955318" |
| customer_email | No | The customer's email address. | "elohor@example.com" |

**Example request:**

```bash
curl --location -g '{{base_url}}/virtual-accounts/create' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data-raw '{
  "account_type": "onetime",
  "currency": "NGN",
  "account_name": "Elohor",
  "amount": 100
}'
```

**Example response:**

```json
{
  "success": true,
  "message": "Action was Succesful",
  "data": {
    "id": "5e3fefa6-03e9-4152-9786-57f43dc6642e",
    "sort_code": "51411",
    "bank": "Bloc MFB",
    "account_name": "GEVS-checkout",
    "account_number": "1000008398",
    "cba_account_id": "839",
    "parent_id": "4012326f-55d3-4958-bd7d-98d2e504eb3b",
    "validity_type": "Onetime",
    "created_at": "2026-10-29T13:49:23.303440048Z",
    "expires_at": "2026-10-29T14:19:21.833221062Z"
  }
}
```

The customer must pay before `expires_at` (about 30 minutes after creation). Use the returned value rather than calculating it yourself.

### PalmPay: permanent account

PalmPay permanent accounts are for individuals only. Note that PalmPay uses `account_type` instead of `virtual_account_type`, and `provider` is lowercase `palmpay`.

**Request body payload:**

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| provider | Yes | `palmpay`. | "palmpay" |
| currency | Yes | `NGN`. | "NGN" |
| account_type | Yes | `Permanent`. The capitalisation matters. | "Permanent" |
| type | Yes | `individual`. Corporate accounts are not supported on PalmPay. | "individual" |
| reference | Yes | A unique identifier you generate for this request, up to 120 characters. Reuse it only to retry the same request. | "a1b2c3d4-e5f6-7890-abcd-ef1234567890" |
| account_name | Yes | The name to give the account, up to 200 characters. | "John Doe" |
| customer_name | Yes | The account holder's name, up to 200 characters. | "John Doe" |
| customer_email | Yes | The customer's email address. | "john.doe@example.com" |
| bvn | Conditional | The customer's 11-digit BVN. Send `bvn` or `nin`; if you send both, the NIN is used for verification. PalmPay checks the number, so a correctly formatted dummy number can still be rejected. | "22222222222" |
| nin | Conditional | The customer's 11-digit NIN, as an alternative to `bvn`. | "11111122221" |

**Example request:**

```bash
curl --location -g '{{base_url}}/virtual-accounts/create' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data-raw '{
  "provider": "palmpay",
  "currency": "NGN",
  "account_type": "Permanent",
  "type": "individual",
  "reference": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "account_name": "John Doe",
  "customer_name": "John Doe",
  "customer_email": "john.doe@example.com",
  "bvn": "22222222222"
}'
```

**Example response:**

```json
{
  "success": true,
  "message": "Action was Succesful",
  "data": {
    "reference": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "account_number": "8700000001",
    "account_name": "John Doe",
    "bank": "PalmPay",
    "validity_type": "Permanent"
  }
}
```

The response also carries a provider-specific `status`, which is not a payment status. Save the account details against your customer and keep the account available for future deposits.

### PalmPay: one-time account

**Request body payload:**

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| provider | Yes | `palmpay`. | "palmpay" |
| currency | Yes | `NGN`. | "NGN" |
| account_type | Yes | `onetime`. | "onetime" |
| reference | Yes | A unique identifier you generate for this payment, up to 120 characters. Keep it unchanged when you retry. | "3f2c9a7e-1b4d-4e8f-9a6c-5d7e8f9a0b1c" |
| amount | Yes | The amount in naira, at least 100, with at most two decimal places. Send `"1500.00"` for NGN 1,500, not `150000`. | "100.00" |
| account_name | No | A payment title, up to 200 characters. Show the customer the `account_name` returned by the API. | "PalmPay Test" |
| customer_email | No | The customer's email address. If you leave it out, your merchant email is used. | "customer@example.com" |
| return_url | Yes | Where the customer is sent after paying. A return to this URL is not proof of payment. | "https://example.com/payment-return" |
| order_expire_seconds | No | How long the account stays payable, from 1800 to 86400 seconds. Defaults to 1800. | 1800 |

BVN and NIN are not needed for one-time accounts.

**Example request:**

```bash
curl --location -g '{{base_url}}/virtual-accounts/create' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data-raw '{
  "provider": "palmpay",
  "currency": "NGN",
  "account_type": "onetime",
  "reference": "3f2c9a7e-1b4d-4e8f-9a6c-5d7e8f9a0b1c",
  "amount": "100.00",
  "account_name": "PalmPay Test",
  "customer_email": "customer@example.com",
  "return_url": "https://example.com/payment-return",
  "order_expire_seconds": 1800
}'
```

**Example response:**

```json
{
  "success": true,
  "message": "Action was Succesful",
  "data": {
    "reference": "3f2c9a7e-1b4d-4e8f-9a6c-5d7e8f9a0b1c",
    "account_number": "8700000000",
    "account_name": "PalmPay Test (Pay NGN 100.00)",
    "bank": "PalmPay",
    "status": "pending",
    "validity_type": "Onetime",
    "order_no": "example-provider-order-number",
    "amount": "100.00",
    "expires_at_unix": 1789905229
  }
}
```

`status: "pending"` means the account exists and no transfer has been confirmed yet. Fulfil the order only after you receive a successful collection webhook. Use `expires_at_unix` (Unix seconds) to drive your countdown.

### List all Virtual Accounts

Returns every virtual account that has been created under your merchant profile, with all standard account fields (account number, bank/provider, account name, status, date created, currency). Results are paginated and can be narrowed by status, provider, currency, creation date, or a free-text search across account number / account name.

| Method | URL | Description |
|--------|-----|-------------|
| GET | /virtual-accounts | Fetches all virtual accounts created under the authenticated merchant, with optional filters and pagination. |

**Query parameters:**

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| per_page | No | How many records to return per page. Min 1, max 100. Defaults to 15. | 20 |
| page | No | Which page of results to return (1-indexed). Defaults to 1. | 2 |
| status | No | Only return VAs with this exact status. No default — omitted means all statuses (including inactive/decommissioned) are returned. Case-insensitive. | "approved" |
| validity_type | No | Only return VAs of this validity. Allowed values are exactly `Onetime` or `Permanent`. Case-insensitive via normalization (any casing accepted then matched to the canonical form). Omitted returns both. An unrecognized value returns `422` with an "The selected validity type is invalid." error — not an empty result set. | "Permanent" |
| provider | No | Filter by the banking/provider slug that issued the account. | "Bloc" |
| currency | No | Filter by ISO 4217 currency code. | "NGN" |
| search | No | Free-text search. Matches account_number or account_name containing the value (case-insensitive LIKE). | "1000007858" |
| created_from | No | ISO 8601 / YYYY-MM-DD. Only return accounts created on or after this date. | "2026-01-01" |
| created_to | No | ISO 8601 / YYYY-MM-DD. Only return accounts created on or before this date. Must be >= `created_from` if both are supplied. | "2026-12-31" |

**Validation / error codes:**

| Scenario | HTTP status | Error envelope |
|----------|-------------|----------------|
| No API key or invalid key | 401 | `{ "status": "Error", "message": "No credentials provided" / "Invalid credentials" }` |
| `per_page > 100` or `per_page < 1` | 422 | `{ "success": false, "message": "Invalid filter parameters", "errors": { "per_page": ["The per page must not be greater than 100."] } }` |
| `created_to` is earlier than `created_from` | 422 | `{ "success": false, "message": "Invalid filter parameters", "errors": { "created_to": ["The created to must be a date after or equal to created from."] } }` |
| Rate-limit hit | 429 | Standard throttle response with `Retry-After` header (uses the same 6 000 req/min external-API policy as other Cray endpoints). |

**Example request:**

```bash
curl --location -g '{{base_url}}/virtual-accounts?per_page=20&status=approved&provider=Bloc&currency=NGN&created_from=2026-01-01&created_to=2026-12-31&search=1000007858' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "message": "Successful",
  "data": {
    "virtual_accounts": [
      {
        "id": 1,
        "account_reference": "f7647d29-0734-4eb9-80e6-6547bc40e637",
        "account_name": "Acme Checkout",
        "account_number": "1000007858",
        "bank": "Bloc MFB",
        "validity_type": "Onetime",
        "currency": "NGN",
        "status": "approved",
        "provider": "Bloc",
        "amount": "N100.00",
        "is_subaccount": false,
        "subaccount_id": "-",
        "created_at": "01 Sep, 2026 07:23:00",
        "expires_at": null,
        "request_channel": "api"
      }
    ],
    "pagination": {
      "count": 1,
      "total": 6,
      "per_page": 15,
      "current_page": 1,
      "last_page": 1,
      "next_page_url": null,
      "previous_page_url": null
    }
  }
}
```

  
  

A **business account** is a virtual account opened against your registered company rather than an individual. It is created as a KYB-verified business sub-account with our banking partner — the director's **BVN** and the company **RC number** are validated before the account is issued. Business accounts are always issued in **NGN**.

You may pass the **business_name** in the request to set the name the account is opened with. If you omit it, the business name is taken from your merchant profile, so existing integrations continue to work unchanged.

> **⚠️ Important:** The business name used to open the account **must be the registered name that the `rc_number` belongs to**. KYB verification matches this business name against the company tied to the RC number — if they do not match, account creation will fail. Whether you pass `business_name` in the request or fall back to your Cray profile, ensure it is the exact registered name for the company whose RC number you provide.

**Eligibility:** your merchant account must have **completed KYC** and be on a tier **above Starter Business**. Otherwise the request is rejected with a `401` and an `error_code` explaining what to fix.

### Create business account:

| Method | URL | Description |
|--------|-----|-------------|
| POST | /corporate-accounts/create | Creates a KYB-verified business NGN account under your merchant profile. |

**Request body payload:**

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| full_name | Yes | Full name of the director / contact (the BVN owner). | "Jane Doe" |
| bvn | Yes | Bank Verification Number of the director (11 digits). | "22192474887" |
| rc_number | Yes | Company registration (RC) number — validated against the business name. | "99988828822" |
| phone | Yes | Contact phone number. | "08030000000" |
| customer_email | Yes | Contact email. | "ops@acme.co" |
| business_type | Yes | Type of business entity. One of: COMPANY, BUSINESS_NAME, INCORPORATED_TRUSTEES, LIMITED_PARTNERSHIP, LIMITED_LIABILITY_PARTNERSHIP. | "COMPANY" |
| business_name | No | Registered business name to open the account with. If omitted, your Cray profile business name is used. Must match the registered name tied to the `rc_number`. | "Acme Industries Ltd" |
| tin | No | Tax Identification Number. | "0102030405" |

**Example request:**

```bash
curl --location -g '{{base_url}}/corporate-accounts/create' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data-raw '{
    "full_name": "Jane Doe",
    "bvn": "22192474887",
    "rc_number": "99988828822",
    "phone": "08030000000",
    "customer_email": "ops@acme.co",
    "business_type": "COMPANY",
    "business_name": "Acme Industries Ltd",
    "tin": "0102030405"
}'
```

**Example response:**

```json
{
  "success": true,
  "message": "Action was Succesful",
  "data": {
    "id": "acc_9ad98621",
    "sort_code": "51411",
    "bank": "Bloc MFB",
    "account_name": "Acme Industries Ltd",
    "account_number": "1000000001",
    "validity_type": "Permanent",
    "created_at": "2026-06-26T10:00:00.000Z"
  }
}
```

  

  
  

> **🚧 Important:** You have to complete a KYC process on the merchant portal ([app.crayfi.com](https://app.crayfi.com)) before you can begin generating a USD permanent virtual account.

**Steps to follow:**

1. Login to your Cray Account

2. Go to **Collections → Virtual Accounts**

3. Switch your currency to **USD** (if not already done)

4. Click **Request Virtual Account**

5. You will be required to complete the additional KYC process.

> **📘 Note:** Only when this has been approved will you be able to create a USD virtual account.

### Create USD virtual account:

| Method | URL | Description |
|--------|-----|-------------|
| POST | /virtual-accounts/create | Creates a USD permanent virtual account for the provided customer email. |

**Request body payload:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| currency | The currency for the virtual account. Must be USD. | "USD" |
| customer_email | The email address of the customer for identification and communication. | "johndoe@gmail.com" |

**Example request:**

```bash
curl --location -g '{{base_url}}/virtual-accounts/create' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data-raw '{
    "currency": "USD",
    "customer_email": "johndoe@gmail.com"
}'
```

**Example response:**

```json
{
    "success": true,
    "message": "Action was Succesful",
    "data": {
        "account_name": "John Doe",
        "account_reference": "cust3565751",
        "validity_type": "Permanent",
        "status": "pending_provisioning",
        "message": "Virtual account creation is in progress. You will be notified when your account is ready."
    }
}
```

The account is provisioned asynchronously. When it is ready, you receive a `virtual_account.activated` webhook containing the bank details your customer pays into.

**Sample webhook:**

```json
{
  "event": "virtual_account.activated",
  "data": {
    "event": "virtual_account.activated",
    "currency": "usd",
    "bank_name": "Bank of Nowhere",
    "bank_address": "1800 North Pole St., Orlando, FL 32801",
    "payment_rails": [
      "ach_push",
      "fednow",
      "wire"
    ],
    "bank_account_number": "6833179810",
    "bank_routing_number": "101019644",
    "bank_beneficiary_name": "johndoe@gmail.com",
    "bank_beneficiary_address": "1 Test St, San Francisco, CA 94105, US"
  },
  "hash": "441o62BUVjOBzK5fABtS8jySuLqqCfAAAlONbqZn07c="
}
```

---

## Card collections

URL: https://docs.crayfi.com/v2/collections/card-collections

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Card Processing enables the secure handling of all payment card transactions through the Cray API, supporting various card types and industry-standard verification methods. This service manages the entire lifecycle of card payments, from initial validation and authorization to final processing and settlement. It provides you with detailed transaction results and webhooks, which are essential for timely and accurate reconciliation purposes.

### Get Subaccounts

Card payments are collected into a subaccount. Call this endpoint first to get the `subaccount_id` you pass when you initiate a card payment.

| Method | URL | Description |
|--------|-----|-------------|
| GET | /get-subaccount | Fetches the full list of your configured subaccounts. |

**Example request:**

```bash
curl --location -g '{{base_url}}/get-subaccount' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "status": true,
  "message": "SubAccount Details",
  "data": [
    {
      "uuid": "9999999999",
      "subaccount_token": "2x9Kf7Qm3pTn8wRv0bGdLs1Yh6Jc4Ze5Ua",
      "company_name": "test",
      "company_email": "test@gmail.com"
    }
  ]
}
```

### Initiate card payment

The **Initiate** endpoint begins a new payment flow by securely creating a transaction session with all specified parameters (card details, amount, customer info, etc.). This request establishes the foundation for subsequent payment operations, returning a unique identifier that must be referenced throughout the transaction lifecycle.

| Method | URL |
|--------|-----|
| POST | /initiate |

**Request Body Payload:**

| Parameter | Description |
|-----------|-------------|
| reference | A unique identifier for the transaction. It's used to track or reference the payment later. Usually a UUID. |
| amount | The transaction amount to be charged. Example: "50". |
| narration | A short description of the transaction's purpose (e.g., "Payment for services"). |
| currency | The currency in which the payment is being made. Example: "USD". |
| card_data | Contains the credit card information for the transaction. |
| pan | Card number (e.g., "5399832641760090"). |
| cvv | 3-digit security code on the card (e.g., "146"). |
| expiryMonth | 2-digit expiration month of the card (e.g., "05"). |
| expiryYear | 2-digit expiration year (e.g., "50" = 2050). |
| callback_URL | The endpoint on your server to receive payment status updates after processing. |
| metadata | Custom key-value pairs for internal use. Example: "reason": "Payment for F1" |
| billing_information | The billing address of the cardholder. |
| postcodeZip | ZIP or postal code. |
| street | Street name or address. |
| city | City name. |
| country | 3-letter ISO country code (e.g., "TUR" for Turkey). |
| stateProvince | State or province name. |
| customer_information | Basic details about the customer. |
| email | Customer's email address. |
| firstName | Customer's first name. |
| lastName | Customer's last name. |
| mobilePhone | Customer's phone number in international format. |
| subaccount_id | The unique ID of the subaccount responsible for the transaction. This is obtained via the "Get Subaccount" API. |

**Example request:**

```bash
curl --location '{{base_url}}/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data-raw '{
    "reference": "4aeb118e-5009-450a-94fc-d74f6cd88646",
    "amount": "1",
    "narration": "Narration here",
    "currency": "USD",
    "card_data": {
        "pan": "5399832641760090",
        "cvv": "146",
        "expiryMonth": "05",
        "expiryYear": "50"
    },
    "callback_url": "https://redirect_url.com",
    "metadata": {
        "reason": "Payment for F1"
    },
    "device_information": {
        "http_browser_language": "en-US",
        "http_browser_java_enabled": false,
        "http_browser_javascript_enabled": true,
        "http_browser_color_depth": "24",
        "http_browser_screen_height": "820",
        "http_browser_screen_width": "360",
        "http_browser_time_difference": "",
        "user_agent_browser_value": "Mozilla/5.0 (Linux; Android 12; Infinix X6819) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36",
        "device_channel": "Browser",
        "ip_address": "54.144.139.131"
    },
    "billing_information": {
        "postcodezip": "100001",
        "street": "lagos",
        "city": "lagos",
        "country": "NGA",
        "stateProvince": "lagos"
    },
    "customer_information": {
        "email": "test@testmail.com",
        "firstName": "testFirstName",
        "lastName": "testLastName",
        "mobilePhone": "+1 555 1234 567"
    },
    "subaccount_id": "b0e1a8c2-5d9f-4f3b-9d72-6a3e2f8e5c14"
}'
```

**Example response:**

```json
{
  "status": true,
  "message": "Transaction Initialized",
  "data": {
    "status": "AUTHENTICATION_INITIATED",
    "transaction_id": "X27TKSDUPL8VNRHJ9Z3Y"
  }
}
```

### Process Payment: Charge Endpoint

The **Charge** endpoint processes payment transactions against customer payment methods, capturing funds for products or services. This essential endpoint supports multiple currencies, custom metadata, and provides detailed response data including authorization status and transaction identifiers.

| Method | URL |
|--------|-----|
| POST | /charge |

**Request Body Payload:**

| Parameter | Description |
|-----------|-------------|
| transaction_id | A unique identifier for the transaction you want to charge. Example: "SRK4NC92PFHLGZW78A3E" |

**Example request:**

```bash
curl --location '{{base_url}}/charge' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "transaction_id": "SRK4NC92PFHLGZW78A3E"
}'
```

**Example response:**

  
    ```json
    {
      "status": true,
      "message": "Charge attempted",
      "data": {
        "status": "redirect_auth",
        "reference": "921ba7dc-b080-4da9-886e-a18920fa7b2f",
        "redirect_auth_data": {
          "customizedHtml": {
            "3ds2": {
              "acsUrl": "https://acsv2.m2pfintech.com/emv/auth/process/10058/creq",
              "cReq": "eyJ0aHJlZURTU2VydmVyVHJhbnNJRCI6ImU1ZjVmY2YxLTk5YmMtNDZmYy1hNTkzLTExMjM2ODAwNGFmOCIsImFjc1RyYW5zSUQiOiIyNWQ3MGU5OC05OGQ2LTQzOTAtODhlYi1hNTFlMThhZjk0OWQiLCJjaGFsbGVuZ2VXaW5kb3dTaXplIjoiMDUiLCJtZXNzYWdlVHlwZSI6IkNSZXEiLCJtZXNzYWdlVmVyc2lvbiI6IjIuMi4wIn0"
            }
          },
          "domainName": "acsv2.m2pfintech.com",
          "html": "<div>      var e=document.getElementById(\"threedsChallengeRedirectForm\"); if (e) { e.submit(); if (e.parentNode !== null) { e.parentNode.removeChild(e); } }  </div>"
        }
      }
    }
    ```
  
  
    ```json
    {
      "status": true,
      "message": "Charge attempted",
      "data": {
        "status": "redirect_auth",
        "reference": "286ba835-6ec4-4545-b008-0338881b741c",
        "redirect_auth_data": "http://sandbox.crayfi.io/api/load-threedes?modal_url=https%3A%2F%2Fstandard.paystack.co%2Fcharge%2Fauth%2Fd2d50f49neovqb5cce2%3Flang%3Den&redirect_url=http%3A%2F%2Fsandbox.crayfi.io%2Fapi%2Fvalidate-3ds%2F286ba835-6ec4-4545-b008-0338881b741c"
      }
    }
    ```
  

### Query transaction

The **Query Transaction** endpoint lets you pull up all the detailed info about any transaction using its unique ID. This is your go-to tool for easily checking payment statuses, amounts, and everything you need for quick reconciliation and monitoring.

| Method | URL |
|--------|-----|
| GET | /query/{reference} |

**Example request:**

```bash
curl --location '{{base_url}}/query/{reference}' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "status": true,
  "message": "Charge attempted",
  "data": {
    "status": "Successful",
    "reference": "87c89286-afbc-4776-adfd-665c9927b2db",
    "provider_reference": "F6L2RN8TM7AHZ491SCGQ",
    "amount": 5,
    "net_amount": 4.73,
    "fee": 0.28,
    "payment_channel": "card",
    "redirect_url": "https://redirect_url.com",
    "callback_url": "https://redirect_url.com",
    "customer": {
      "name": "Deion Haag",
      "email": "user@joinramp.co"
    },
    "metadata": "",
    "retrieval_reference_number": "774848",
    "stan": "999595958",
    "created": "2025-03-21T07:47:03.000000Z"
  }
}
```

---

## Hosted checkout

URL: https://docs.crayfi.com/v2/collections/hosted-checkout

Hosted Checkout lets you collect card payments without handling raw card data. Initialize a payment with your subaccount token and a callback URL, then redirect the customer to the Cray-hosted payment link.

### Overview

Hosted Checkout is a two-step flow:

1. **Get your subaccount token** — call Get Subaccount to retrieve the token of the subaccount you want to collect into.
2. **Initialize the checkout** — call Initialize with that token, the amount, customer details and your callback_url. Cray returns a hosted payment link to redirect the customer to.

### Step 1 — Get the subaccount token

| Method | URL |
|--------|-----|
| GET | /get-subaccount |

**Example request:**

```bash
curl --location '{{base_url}}/get-subaccount' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "status": true,
  "message": "SubAccount Details",
  "data": [
    {
      "uuid": "9999999999",
      "subaccount_token": "2x9Kf7Qm3pTn8wRv0bGdLs1Yh6Jc4Ze5Ua",
      "company_name": "test",
      "company_email": "test@gmail.com"
    }
  ]
}
```

Use the subaccount_token value as the token in Step 2.

### Step 2 — Initialize the checkout

| Method | URL |
|--------|-----|
| POST | /checkout/initialize |

**Request Body Payload:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| amount | Yes | Amount to collect. Example: 1. |
| currency | Yes | Currency of the payment. Example: USD. |
| token | Conditional | The subaccount token returned by Get Subaccount in Step 1. Required when defaultPaymentMethod is card. Optional when defaultPaymentMethod is transfer or mobile_money. |
| reference | Yes | Your unique reference for this payment. Must be unique per merchant. |
| defaultPaymentMethod | Yes | Default payment method to present. Example: card. |
| feeBearer | Yes | Who bears the fee: merchant or customer. |
| narration | No | Short description of the payment. |
| paymentMethods | No | Array of allowed payment methods. Example: ["card"]. |
| callback_url | No | URL Cray uses for the post-payment callback/redirect for this transaction. When provided it overrides the default and is returned by the Query endpoint as callback_url and redirect_url. Must be a valid URL. |
| customer.name | Yes | Customer full name. |
| customer.email | Yes | Customer email address. |
| metadata | No | Custom key-value pairs for your own reference. |

> **Note:** `token` is only mandatory for card payments (`defaultPaymentMethod: "card"`). It can be omitted when `defaultPaymentMethod` is `transfer` or `mobile_money`.

**Example request:**

```bash
curl --location '{{base_url}}/checkout/initialize' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "amount": 1,
    "currency": "USD",
    "token": "2x9Kf7Qm3pTn8wRv0bGdLs1Yh6Jc4Ze5Ua",
    "reference": "4aeb118e-5009-450a-94fc-d74f6cd88646",
    "defaultPaymentMethod": "card",
    "feeBearer": "merchant",
    "narration": "Payment for order #0001",
    "paymentMethods": ["card"],
    "callback_url": "http://google.com",
    "customer": {
        "name": "Jane Doe",
        "email": "jane.doe@crayfinance.com"
    },
    "metadata": {
        "order_id": "0001"
    }
}'
```

**Example response:**

```json
{
  "status": true,
  "message": "Link generated successfully",
  "data": {
    "link": "https://checkout.connectramp.com/pay/RHEZ2VYSJ5P3LQA",
    "reference": "4aeb118e-5009-450a-94fc-d74f6cd88646",
    "payCode": "RHEZ2VYSJ5P3LQA"
  }
}
```

Redirect the customer to data.link to complete the payment. Use data.payCode (or your reference) with the Query endpoint to check status.

### About callback_url

callback_url is optional. When you pass a valid URL at initialize, Cray stores it with the payment and uses it as the post-payment callback/redirect for that transaction; it is also echoed back by the Query endpoint as both callback_url and redirect_url. If you omit it, Cray falls back to the default callback configured for your account.

### Hosted Bank Transfer

Hosted Checkout can also be used to collect via bank transfer. Set `defaultPaymentMethod: "transfer"` and redirect the customer to the returned `data.link`. Unlike card payments, `token` is not required for transfer.

**Example — Hosted Transfer initialize:**

```bash
curl --location '{{base_url}}/checkout/initialize' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "amount": 200,
    "currency": "NGN",
    "reference": "{{$randomUUID}}",
    "defaultPaymentMethod": "transfer",
    "feeBearer": "merchant",
    "narration": "Payment for order #0001",
    "paymentMethods": ["transfer"],
    "callback_url": "http://google.com",
    "customer": {
        "name": "Jane Doe",
        "email": "jane.doe@crayfinance.com"
    },
    "metadata": {
        "order_id": "0001"
    }
}'
```

### Hosted Mobile Money

Hosted Checkout can also be used for Mobile Money collections. In this flow, you initialize a hosted payment link with `defaultPaymentMethod: "mobile_money"` and redirect the customer to the returned `data.link`. The hosted page loads the available mobile money providers for the transaction, collects the customer details needed for that currency, calls the Mobile Money initiate endpoint internally, and then either redirects the customer or keeps them on a waiting screen while the transaction is confirmed.

**Supported hosted Mobile Money currencies:**

| Currency | Provider behaviour on hosted checkout | Extra required fields on the hosted form |
|----------|----------------------------------------|------------------------------------------|
| `NGN` | Fixed provider list: `opay`, `palmpay` | Phone number |
| `GHS` | Fixed provider list: `MTN`, `AIRTEL`, `VODAFONE` | Phone number |
| `KES` | Fixed provider list: `mpesa`, `AIRTEL` | Phone number |
| `ZMW` | Fixed provider list: `MTN`, `AIRTEL` | Phone number, `firstname`, `lastname` |
| `XOF` | Provider list depends on `country` | Phone number, `country`, `firstname`, `lastname` |
| `XAF` | Provider list depends on `country` | Phone number, `country`, `firstname`, `lastname` |

**Important notes:**

1. For `XOF` and `XAF`, pass `country` when you initialize the hosted link. The hosted page uses that country to determine which provider options to show.
2. For `NGN`, the hosted page shows `opay` and `palmpay`. `display_name` is optional and only used for `opay`.
3. For `ZMW`, the hosted form collects `firstname` and `lastname`, but does not require `country`.
4. After submit, hosted checkout behaves like a normal Mobile Money flow:
   - if the initiate response contains `redirect_url`, redirect the customer there
   - if `redirect_url` is `null`, keep the customer on a waiting / processing state and poll for the final status

**Example — Hosted Mobile Money initialize (`ZMW`):**

```bash
curl --location '{{base_url}}/checkout/initialize' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "amount": 1,
    "currency": "ZMW",
    "reference": "zmw-link-001",
    "defaultPaymentMethod": "mobile_money",
    "feeBearer": "merchant",
    "customer": {
        "name": "Jane Doe",
        "email": "jane.doe@crayfinance.com"
    },
    "callback_url": "https://example.com/callback"
}'
```

**Example — Hosted Mobile Money initialize (`XOF`, Benin):**

```bash
curl --location '{{base_url}}/checkout/initialize' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "amount": 200,
    "currency": "XOF",
    "country": "benin",
    "reference": "xof-link-001",
    "defaultPaymentMethod": "mobile_money",
    "feeBearer": "merchant",
    "customer": {
        "name": "Jane Doe",
        "email": "jane.doe@crayfinance.com"
    }
}'
```

### Query the payment

| Method | URL |
|--------|-----|
| GET | /checkout/query/{reference} |

**Example request:**

```bash
curl --location '{{base_url}}/checkout/query/4aeb118e-5009-450a-94fc-d74f6cd88646' \
--header 'Authorization: Bearer <your_api_key>'
```

**Example response:**

```json
{
  "status": true,
  "message": "Charge attempted",
  "data": {
    "status": "Successful",
    "reference": "4aeb118e-5009-450a-94fc-d74f6cd88646",
    "provider_reference": "F6L2RN8TM7AHZ491SCGQ",
    "amount": 1,
    "net_amount": 0.95,
    "fee": 0.05,
    "payment_channel": "card",
    "redirect_url": "http://google.com",
    "callback_url": "http://google.com",
    "customer": {
      "name": "Jane Doe",
      "email": "jane.doe@crayfinance.com"
    },
    "metadata": "",
    "created": "2026-05-17T18:35:17.000000Z"
  }
}
```

---

## Payment Initialization

URL: https://docs.crayfi.com/v2/collections/payment-initialization

**Endpoint access**
**Authentication:** your merchant account is identified by `public_key` and `website_id` in the request body, or by your secret key in the path for the verify endpoint. No `Authorization` header, scope or request signature applies.

Initialize, create and verify payments using credentials carried in the request.

These endpoints identify your merchant account from **credentials in the request itself**, not from a header. They take no `Authorization` Bearer key, no [API key scope](/v2/cray-docs/api-key-scopes) and no [request signature](/v2/cray-docs/request-signing).

## Endpoints

Paths are relative to the [base URL](/v2/cray-docs/environments).

| Method | Path | Credentials |
| --- | --- | --- |
| POST | `/payments/initialize` | `public_key` and `website_id` in the request body |
| POST | `/payments/initialize/new` | `public_key` and `website_id` in the request body |
| POST | `/payment/initialize` | `public_key` and `website_id` in the request body |
| POST | `/payment/create` | `public_key` and `website_id` in the request body |
| POST | `/payment/merchant/create` | `public_key` and `website_id` in the request body |
| GET | `/payment/merchant/verify/{referenceCode}/{secretKey}` | Your secret key in the path |

## Credential Fields

| Field | Where | Description |
| --- | --- | --- |
| `public_key` | Body | Your Public Key (`lrp_...`) from **Dashboard → Settings → Developer**. |
| `website_id` | Body | The ID of the website the payment belongs to. |
| `referenceCode` | Path (verify only) | The reference of the payment to verify. |
| `secretKey` | Path (verify only) | Your Secret Key (`lrs_...`). |

`GET /payment/merchant/verify/{referenceCode}/{secretKey}` carries your **Secret Key in the URL**. Call it only from your server, never from a browser or mobile app, and make sure your HTTP client, proxies and logs do not record full request URLs.

---

## Mobile money

URL: https://docs.crayfi.com/v2/collections/mobile-money

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Mobile Money (MoMo) is a game-changer for payments, especially in Africa and other emerging markets! This service lets your users make payments directly from their mobile phone wallets, offering a secure, widespread, and incredibly convenient alternative to traditional banking. Integrating MoMo through Cray means you can seamlessly tap into this massive user base, enabling quick and reliable transactions that feel native to their mobile experience. It’s the simple way to expand your reach and make collecting payments effortlessly accessible.

### Initiate Mobile Money (MoMo) Transaction

The **Initiate** endpoint is how you kick off a Mobile Money (MoMo) payment! This endpoint is designed to immediately trigger a payment request to a user's mobile wallet, using their phone number and preferred payment provider. It lets you specify all the transaction details like the amount, currency, and a unique customer reference. It's super useful for enabling seamless and efficient MoMo payments in applications targeting regions where mobile money is super prevalent.

| Method | URL |
| ------ | ---------------------------------------------------------------------------------------------------- |
| POST   | /momo/initiate |

**Common request body payload:**

These five fields are required on every corridor:

| Parameter       | Description                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| customer_reference | A unique identifier for the customer or transaction, often a UUID. Used to track or reconcile payments. Example: "16401e05-0c12-4ccc-bbff-ee1a767d39f2" |
| amount              | The amount to be charged or paid. Must be greater than 0. Example: "20"                                                                                 |
| currency            | The currency of the transaction. One of `GHS`, `KES`, `NGN`, `XOF`, `XAF`, `ZMW`, `MZN`.                                                            |
| phone_no           | The customer's phone number in international format. Example: "233801234567"                                                                            |
| payment_provider   | The Mobile Money wallet to charge. Accepted values depend on the currency — see the tabs below.                                                          |

These are accepted on every corridor and are always optional:

| Parameter       | Description                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| callback_url       | A URL we redirect the customer back to after a hosted/redirect flow completes. Must be a valid http/https URL.                                           |
| subaccount_id      | Routes the collection to a specific subaccount.                                                                                                         |
| payment_channel    | The channel the customer is paying from. Defaults to `USSD`.                                                                                            |
| device_information | Free-form device metadata you want stored against the transaction.                                                                                      |
| return_url         | A URL stored against the transaction. When the collection is `Successful`, it is sent back to you as `data.return_url` in the webhook. Must be a valid URL. Required for some NGN providers — see the NGN tab. |

The remaining fields — and the accepted `payment_provider` values — depend on the currency. Pick your corridor below.

  

**Additional fields**

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| return_url | Conditional | Required when `payment_provider` is **not** `opay` or `palmpay`. For `opay` and `palmpay` it is optional. When sent, it is returned as `data.return_url` on the `Successful` webhook. |
| display_name | Optional | Merchant display name shown on the OPay checkout page. Used only when `payment_provider` is `opay`. |
| otp | Optional | Boolean. Accepted for backwards compatibility; NGN collections are processed directly. |

**Accepted `payment_provider` values**

| Provider | Notes |
| -------- | ----- |
| `opay` | Returns an OPay hosted wallet checkout page in `redirect_url`. |
| `palmpay` | Returns a PalmPay hosted checkout page in `redirect_url`. Minimum amount **100 NGN**, and only valid for NGN. |

**Example request:**

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "3950",
    "currency": "NGN",
    "phone_no": "2348146152814",
    "payment_provider": "opay",
    "otp": false,
    "return_url": "https://merchant.example.com/payments/opay/return",
    "display_name": "Merchant Store"
}'
```

**Example response:**

```json
{
    "status": true,
    "message": "Transaction is processing",
    "data": {
        "status": "Processing",
        "reference": "TNW4UKB1XQZSVP86E7AR",
        "customer_reference": "b6f4268e-2e20-4167-af84-a13f46f8344a",
        "amount": "3950.00",
        "currency": "NGN",
        "phone_no": "+2348146152814",
        "provider_message": null,
        "payment_provider": "PalmPay",
        "redirect_url": "https://pay.palmpay.example/checkout/TNW4UKB1XQZSVP86E7AR",
        "date": "2025-11-24T14:42:19.000000Z"
    }
}
```

  
  

**Additional fields — all required for XOF**

| Parameter | Description |
| --------- | ----------- |
| firstname | Customer's first name. |
| lastname | Customer's last name. |
| country | The country the customer is paying from. Determines which providers are valid. One of `benin`, `senegal`, `togo`, `ivory coast`, `burkina faso`, `mali`. |

The accepted `payment_provider` values depend on `country` — pick the country below.

  

Providers: `orange`, `wave`, `wizall`, `free`, `expresso`.

`orange` and `wave` return a `redirect_url`; `wizall`, `free` and `expresso` push a prompt to the handset.

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "a726d74e-2388-4b35-988e-1555325a1a64",
    "amount": "3950",
    "currency": "XOF",
    "phone_no": "221771234567",
    "payment_provider": "orange",
    "firstname": "John",
    "lastname": "Doe",
    "country": "senegal"
}'
```

**Example response — Orange Money (Senegal):**

The `redirect_url` is a hosted PayDunya page containing a scannable QR code. `other_urls` carries additional launch links (for example the Orange `maxit` and `om` wallet deep links) which you can surface alongside the primary link to give customers a one-tap option on mobile.

```json
{
    "status": true,
    "message": "Transaction is processing",
    "data": {
        "status": "Processing",
        "reference": "WRHGMY2XJ5DZBU69S4P8",
        "customer_reference": "a726d74e-2388-4b35-988e-1555325a1a64",
        "amount": "200.00000000",
        "currency": "XOF",
        "phone_no": "+221781376018",
        "provider_message": null,
        "payment_provider": "orange-money-senegal",
        "redirect_url": "https://app.paydunya.com/orange-money?data%5Bqrcode%5D=...&data%5Btoken%5D=...",
        "other_urls": {
            "maxit_url": "https://sugu.orange-sonatel.com/mp/dmejhPJQJ-BvtxYHRwBf",
            "om_url": "https://orange-money-prod-flowlinks.web.app/om/dmejhPJQJ-BvtxYHRwBf"
        },
        "date": "2026-03-11T15:08:24.000000Z"
    }
}
```

**Example response — Wave (Senegal):**

Wave returns a hosted checkout URL in `redirect_url`. The `other_urls` field is omitted entirely for Wave — only Orange Money Senegal currently returns extra deep links.

```json
{
    "status": true,
    "message": "Transaction is processing",
    "data": {
        "status": "Processing",
        "reference": "869U23GFLN4QDWVXZB7C",
        "customer_reference": "317e7bd3-3587-40e2-9e03-c05024a317cf",
        "amount": "200.00000000",
        "currency": "XOF",
        "phone_no": "+221763075025",
        "provider_message": null,
        "payment_provider": "wave-senegal",
        "redirect_url": "https://pay.wave.com/c/cos-23g4bg09814ya?a=200&c=XOF&m=Gpay%20Instant%20Solutions%20Limited%20%2A%20DDP%20",
        "date": "2026-03-10T15:42:55.000000Z"
    }
}
```

  
  

Providers: `orange`, `mtn`, `moov`, `wave`.

`wave` returns a `redirect_url`; `orange`, `mtn` and `moov` push a prompt to the handset.

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "3950",
    "currency": "XOF",
    "phone_no": "22507123456",
    "payment_provider": "orange",
    "firstname": "John",
    "lastname": "Doe",
    "country": "ivory coast"
}'
```

  
  

Providers: `mtn`, `moov`. Both push a prompt to the handset, so `redirect_url` is `null`.

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "3950",
    "currency": "XOF",
    "phone_no": "22901612482",
    "payment_provider": "mtn",
    "firstname": "John",
    "lastname": "Doe",
    "country": "benin"
}'
```

  
  

Providers: `moov`, `t-money`. Both push a prompt to the handset, so `redirect_url` is `null`.

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "3950",
    "currency": "XOF",
    "phone_no": "22890123456",
    "payment_provider": "moov",
    "firstname": "John",
    "lastname": "Doe",
    "country": "togo"
}'
```

  
  

Providers: `orange`, `moov`. Both push a prompt to the handset, so `redirect_url` is `null`.

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "3950",
    "currency": "XOF",
    "phone_no": "22370123456",
    "payment_provider": "orange",
    "firstname": "John",
    "lastname": "Doe",
    "country": "mali"
}'
```

  
  

Providers: `orange`, `moov`. Both push a prompt to the handset, so `redirect_url` is `null`.

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "3950",
    "currency": "XOF",
    "phone_no": "22670123456",
    "payment_provider": "orange",
    "firstname": "John",
    "lastname": "Doe",
    "country": "burkina faso"
}'
```

  

  
  

XAF collections are Cameroon only.

Cameroon transactions must be sent as `XAF`. `XOF` is not a valid currency for `country: "cameroon"`.

**Additional fields — all required for XAF**

| Parameter | Description |
| --------- | ----------- |
| firstname | Customer's first name. |
| lastname | Customer's last name. |
| country | Must be `cameroon`. |

**Accepted `payment_provider` values:** `mtn`.

MTN Cameroon pushes a prompt to the handset, so `redirect_url` is `null`.

**Example request:**

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "3950",
    "currency": "XAF",
    "phone_no": "237670123456",
    "payment_provider": "mtn",
    "firstname": "John",
    "lastname": "Doe",
    "country": "cameroon"
}'
```

  
  

Mozambique collections are routed through InTouch.

**Accepted `payment_provider` values**

| `payment_provider` | Carrier | Wallet  | Number prefix |
| ------------------- | ------- | ------- | ------------- |
| `mpesa`            | Vodacom | M-Pesa  | 84            |
| `emola`            | Movitel | e-Mola  | 87            |
| `mkesh`            | Tmcel   | mKesh   | 82            |

Input is trimmed and lowercased. Because Mozambique supports number portability, the prefix is a guide rather than a guarantee — always send the `payment_provider` the customer selected rather than inferring it from their number.

`firstname` and `lastname` are optional for MZN.

**Phone number format:** send `phone_no` in international format (`258846930527`). The local nine-digit form (`846930527`) is also accepted; both are normalised before the request reaches the provider.

**No redirect:** MZN collections always push a prompt to the customer's handset, so `redirect_url` is `null` and there is no `other_urls` map.

**Timing:** the provider contacts the mobile network synchronously during initiation, so this call can take up to a minute to return — noticeably longer than other corridors. The transaction is still asynchronous, and a slow response does not mean it failed.

**Example request — M-Pesa:**

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "500",
    "currency": "MZN",
    "phone_no": "258846930527",
    "payment_provider": "mpesa",
    "firstname": "John",
    "lastname": "Doe"
}'
```

**Example response:**

```json
{
    "status": true,
    "message": "Transaction is processing",
    "data": {
        "status": "Processing",
        "reference": "BK1DLPWN25HXQVJEG8ZM",
        "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
        "amount": "500.00000000",
        "currency": "MZN",
        "phone_no": "258846930527",
        "provider_message": null,
        "payment_provider": "mpesa",
        "redirect_url": null,
        "other_urls": null,
        "date": "2026-09-15T17:06:22.000000Z"
    }
}
```

  
  

**Accepted `payment_provider` values:** `MTN`, `AIRTEL`, `TELECEL`, `VODAFONE`.

No extra fields are required beyond the common payload. GHS collections push a prompt to the customer's handset, so `redirect_url` is `null`.

**Example request:**

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "ad75b9bb-2501-4761-8980-42b525e21c37",
    "amount": "20",
    "currency": "GHS",
    "phone_no": "233801234567",
    "payment_provider": "MTN"
}'
```

  
  

**Accepted `payment_provider` values:** `mpesa`, `AIRTEL`, `tkash`.

No extra fields are required beyond the common payload. KES collections push a prompt to the customer's handset, so `redirect_url` is `null`.

A leading `+` on `phone_no` is stripped for KES before the request reaches the provider, so both `+254712345678` and `254712345678` are accepted.

**Example request:**

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "150",
    "currency": "KES",
    "phone_no": "254712345678",
    "payment_provider": "mpesa"
}'
```

  
  

**Accepted `payment_provider` values:** `MTN`, `AIRTEL`.

`firstname` and `lastname` are not enforced by the API for ZMW, but Cray Hosted Checkout collects them — send them if you have them. ZMW collections push a prompt to the customer's handset, so `redirect_url` is `null`.

**Example request:**

```bash
curl --location '{{base_url}}/momo/initiate' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "customer_reference": "e4d7c3b8-5f29-4b46-81a6-8d98c1e75812",
    "amount": "250",
    "currency": "ZMW",
    "phone_no": "260971234567",
    "payment_provider": "MTN",
    "firstname": "John",
    "lastname": "Doe"
}'
```

  

### Handling `redirect_url`

Not every provider completes a collection the same way. For some, the customer receives a USSD or OTP prompt directly on their phone and confirms it there — in that case `redirect_url` is `null` and the transaction moves to a final state once the customer approves. For others, the customer must be redirected to a hosted checkout page (or a native wallet deep link) to complete the payment — in that case `redirect_url` is populated and you are expected to send the customer to it.

**Providers that return a `redirect_url`:**

| Country       | Provider    | Behaviour                                                                                           |
| ------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| Nigeria       | `opay`      | Returns an Opay hosted wallet checkout page that the customer opens to authorise the payment.            |
| Nigeria       | `palmpay`   | Returns a PalmPay hosted checkout page that the customer opens to authorise the payment.           |
| Senegal       | `orange`    | Returns a hosted payment page with an embedded QR code plus extra deep links under `other_urls`. |
| Senegal       | `wave`      | Returns a hosted Wave checkout page that the customer opens to authorise the payment.              |
| Côte d'Ivoire | `wave`      | Returns a hosted Wave checkout page that the customer opens to authorise the payment.              |

**Providers that push to the phone (no `redirect_url`):** everything else — all GHS, KES, ZMW and MZN providers, `mtn`, `moov`, `free`, `expresso`, `wizall`, `t-money`, and `orange` outside Senegal (Côte d'Ivoire, Burkina Faso, Mali). For these the customer confirms on-device and the response carries `redirect_url: null`.

**How to handle `redirect_url` on your side:**

1. Check `data.redirect_url` after calling `/momo/initiate`.
2. If it is non-null, redirect the customer (or open it in a new window / webview) to that URL. For Orange Money Senegal you will additionally receive an `other_urls` map — surface these as secondary options if you want to bounce customers straight into the Orange wallet app instead of the hosted QR page.
3. If it is `null`, keep the customer on your screen and show a "check your phone" state while the prompt is confirmed on-device.
4. Either way, the transaction is still asynchronous. Use the **Query** endpoint below (or a webhook) to get the final `Successful` / `Failed` state.

### Mobile Money through Hosted Checkout

If you are using Cray Hosted Checkout, the customer does not call `/momo/initiate` directly. Instead, you:

1. Call `/checkout/initialize` with `defaultPaymentMethod: "mobile_money"`
2. Redirect the customer to the hosted `data.link`
3. Let the hosted page collect the required Mobile Money details and call initiate internally
4. Handle the transaction asynchronously through redirect, polling, or webhooks

The hosted page still uses the same underlying Mobile Money lifecycle documented here:

- initiate the transaction
- inspect `data.redirect_url`
- either redirect the customer or keep them on a waiting screen
- requery until the transaction reaches a final state

For `NGN`, the hosted page shows `opay` and `palmpay`. For `ZMW`, the hosted page collects `firstname` and `lastname` in addition to the phone number and selected provider. For `XOF` and `XAF`, the hosted page also depends on the `country` passed during hosted checkout initialization to determine which providers to show.

### Query transaction

The **Query** endpoint is your quick check-in to see exactly what happened with a Mobile Money transaction! It allows you to instantly retrieve the final status of a specific payment by using the unique `customer_reference` from the very start of the process. This is super useful for checking whether a transaction was successful, pending, or failed, giving you and your users real-time visibility. It's the ideal tool for post-payment verification and making sure your reconciliation processes are perfectly automated!

| Method | URL |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /momo/requery/{reference} |

**Example request:**

```bash
curl --location '{{base_url}}/momo/requery/{reference}' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "status": true,
  "message": "Transaction confirmation status",
  "data": {
    "status": "Failed",
    "reference": "2JDSN4LBZWCRQEA9GXFH",
    "customer_reference": "ad75b9bb-2501-4761-8980-42b525e21c37",
    "amount": "20.00",
    "currency": "GHS",
    "phone_no": "233801234567",
    "payment_provider": "MTN",
    "date": "2025-07-30T09:31:29.000000Z"
  }
}
```

### Webhook notification

When a Mobile Money collection reaches a final state (`Successful` or `Failed`) we POST a signed event to your configured webhook URL. Pending transactions do not produce a webhook.

The event name is built from the transaction, so Mobile Money collections always arrive as `collection.mobile_money.successful` or `collection.mobile_money.failed`.

If you sent a `return_url` on initiate, the `Successful` event carries it back as `data.return_url`. It is not sent on `Failed` events, and the key is left out entirely when no `return_url` was supplied.

```json
{
  "event": "collection.mobile_money.successful",
  "data": {
    "customer_reference": "b6f4268e-2e20-4167-af84-a13f46f8344a",
    "transaction_reference": "TNW4UKB1XQZSVP86E7AR",
    "amount": "3950.00000000",
    "charge": "39.50000000",
    "netAmount": "3910.50000000",
    "expectedAmount": "3950.00000000",
    "channel": "Mobile_Money",
    "sender": {
      "sender_name": "2348146152814",
      "sender_bank_code": null,
      "sender_account_number": "2348146152814"
    },
    "status": "Successful",
    "provider_message": null,
    "createdAt": "2025-11-24T14:42:19.000000Z",
    "updatedAt": "2025-11-24T14:47:03.000000Z",
    "return_url": "https://merchant.example.com/payments/opay/return"
  },
  "hash": "pEdGMWXpneeROpaML/L7w6UPTLfciP4SCsbYaAJBAHg="
}
```

Reconcile on `data.customer_reference` (the reference you sent) or `data.transaction_reference` (ours). The webhook body does **not** repeat `currency`, `phone_no` or `payment_provider` — if you need those, read them from your own record or call the Query endpoint.

See [Webhooks](/v2/cray-docs/webhooks) for the full field reference, the signature formula, and how to verify the `hash`.

---

## Stable Coins

URL: https://docs.crayfi.com/v2/collections/stable-coins

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Cray supports cryptocurrency collections via stable coins, starting with USDT on the TRON network. Stable coin collections provide a fast, borderless payment method for your customers with near-instant settlement and minimal fees.

Cray enables businesses to accept payments in **USDT (Tether)** — a widely adopted stable coin pegged to the US Dollar. This provides your customers with a fast, borderless, and low-fee payment option.

## Supported Stable Coins

| Stable Coin | Network | Status |
|-------------|---------|--------|
| **USDT** | TRON (TRC-20) | ✅ Available |

More stable coins and blockchain networks will be added in the future. Currently, **USDT on TRON** is the only supported option.

## How It Works

The stable coin collection flow is simple and developer-friendly:

  

    Call `GET /virtual-accounts/crypto/supported-assets` to get valid asset codes. Never hardcode them.

  

  

    Call `POST /accounts/crypto/vault` with a unique name and `assetId`. This provisions a virtual wallet and returns a deposit address for your customer.

  

  

    Share the returned deposit address with your customer.

  

## Integration

To start collecting USDT payments, use the endpoints below. All requests should be sent to:

```bash
{{base_url}}
```

Supported endpoints:

- `GET /virtual-accounts/crypto/supported-assets`
- `POST /accounts/crypto/vault`

## Get Supported Assets

Before creating a vault, you must retrieve the list of crypto assets available on the platform. This endpoint returns all supported assets along with their identifiers, names, network details, and symbols.

Each asset is tied to a specific blockchain network. For example, USDT on the TRON network will have a unique `assetId` that you must use when creating a vault. Always fetch the supported assets dynamically rather than hardcoding `assetId` values, as the available assets may change.

**Endpoint:** `GET /virtual-accounts/crypto/supported-assets`

**Auth:** `Authorization: Bearer <your_api_key>` plus a signed `X-Signature` header (`collection` scope). See [Request Signing](/v2/cray-docs/request-signing).

**Request body:** None

**cURL:**

```bash
curl --location '{{base_url}}/virtual-accounts/crypto/supported-assets' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

## Create Vault/Asset

A vault is a virtual wallet provisioned for a specific crypto asset. Once created, it generates a unique deposit address that you share with your customer so they can send funds directly to it.

To create a vault, call this endpoint with a unique name and the `assetId` returned from the Get Supported Assets endpoint. The API provisions the wallet on the specified blockchain and returns the deposit address. The generated address is reusable and can be used to receive multiple payments.

**Endpoint:** `POST /accounts/crypto/vault`

**Auth:** `Authorization: Bearer <your_api_key>` plus a signed `X-Signature` header (`collection` scope). See [Request Signing](/v2/cray-docs/request-signing).

**Body:**

```json
{
  "name": "Avengers09909",
  "assetId": "TRX_USDT_S2UZ"
}
```

**cURL:**

```bash
curl --location '{{base_url}}/accounts/crypto/vault' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "name": "Avengers09909",
    "assetId": "TRX_USDT_S2UZ"
}'
```

**Response:**

```json
{
  "status": true,
  "message": "Vault account address created successfully",
  "data": {
    "address": "TX8yh5rtzygsz7sV2zrYCuwqWrgeJybWL7",
    "vaultName": "Avengers09909",
    "status": "approved",
    "asset_type": "TRX_USDT_S2UZ"
  }
}
```

**Failed Response:**

```json
{
  "status": false,
  "success": false,
  "data": [],
  "message": "Unable to create vault address."
}
```

Use a unique name per vault. The `assetId` must match a value returned from the Get Supported Assets endpoint.

---

## Create Virtual Account

URL: https://docs.crayfi.com/v2/collections/create-virtual-account

Method: `POST`

Endpoint: `POST {{base_url}}/virtual-accounts/create`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Use this endpoint to create a permanent NGN virtual account for a customer, on Bloc (the default provider) or PalmPay.

### Permanent accounts

A permanent account receives repeated payments for the same customer. On Bloc the response returns `id`, `bank`, `account_number`, `account_name`, `sort_code`, `validity_type: "Permanent"` and `created_at`. On PalmPay it returns `reference`, `account_number`, `account_name`, `bank`, `status` and `validity_type: "Permanent"`. Show the customer the `account_name` from the response, not the one you sent.

The account-creation `status` is provider-specific and is not a payment status. Save the returned account details against your customer and keep the account available for future deposits.

Each subsequent deposit is its own collection transaction with its own transaction and provider reference. Do not fulfil a deposit using only the account-creation reference, which is shared by every deposit into that account.

### References and retries

Use a stable `reference` for the same account-creation attempt, up to 120 characters. The internal reference is derived from your merchant, the account type and the reference you supply, so do not change the customer or identity details while reusing one.

If the request times out or comes back without a usable account number, retry the same unchanged request rather than generating a new reference. An HTTP success on its own does not guarantee the account details are ready, and the API does not guarantee automatic recovery from every provider failure — a stuck account may need support.

### Payment notifications

Enable merchant webhooks and configure your receiving URL in your Cray integration. When a deposit is confirmed, Cray sends a notification:

| Field | Meaning |
| --- | --- |
| `event` | Collection event, such as `collection.virtualaccount.successful`. |
| `data.customer_reference` | The reference you supplied when creating the account. |
| `data.transaction_reference` | Cray's reference for this individual collection. Use it to deduplicate processing. |
| `data.processorReference` | Provider payment/order reference. |
| `data.recipient` | The receiving account number. |
| `data.amount`, `data.charge`, `data.netAmount` | Gross collection amount, fee and net amount. |
| `data.status` | Collection status, for example `Successful` or `Failed`. |
| `hash` | Base64-encoded HMAC-SHA256 of the JSON-encoded `data` object, using your API key with the `webhook` scope. Preserve field order and number formatting when checking the signature. |

A successful webhook means the collection is confirmed; the wallet credit is processed asynchronously afterwards. Handle duplicate notifications idempotently. See [Webhooks](/v2/cray-docs/webhooks) for signature verification.

### Validation and errors

An invalid currency, account type or identity format returns a validation error, normally HTTP `422`. Authentication, access and provider failures return other non-2xx responses. Check the HTTP status, the error message and the returned account details rather than assuming every response contains an account.

Never ship provider credentials or your API keys to your customer's browser. Your server calls the Cray API with its API key.

---

## Create A One-Time Virtual Account

URL: https://docs.crayfi.com/v2/collections/create-onetime-virtual-account

Method: `POST`

Endpoint: `POST {{base_url}}/virtual-accounts/create`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Use this endpoint to create a one-time virtual account for a single collection, on Bloc (the default provider) or PalmPay. The account expires after a set time.

### Collecting the payment

1. Create the account and save its reference, account number, order number, amount and expiry.
2. Display the returned bank, account name, account number and exact amount in your application.
3. Ask the customer to transfer the exact amount before the account expires. Do not prompt for a transfer if no account number was returned, or if the account has already expired.
4. The provider notifies Cray of the payment. Cray verifies the notification and checks it against the saved order, amount and currency.
5. A confirmed payment creates the collection transaction and queues wallet processing and your merchant webhook.

Creating an account is not a payment. A response with `status: "pending"` only means the account exists and no transfer has been confirmed yet. Fulfil the order only after you receive a successful collection.

### References and retries

Use a stable `reference` for the same account-creation attempt. The internal reference is derived from your merchant, the account type and the reference you supply, so do not change the amount, customer or identity details while reusing one.

If the request times out or comes back without a usable account number, retry the same unchanged request rather than generating a new reference. An HTTP success on its own does not guarantee the account details are ready, and the API does not guarantee automatic recovery from every provider failure — a stuck account may need support.

### Payment notifications

Enable merchant webhooks and configure your receiving URL in your Cray integration. Once the provider confirms the transfer, Cray sends a separate notification:

| Field | Meaning |
| --- | --- |
| `event` | Collection event, such as `collection.virtualaccount.successful`. |
| `data.customer_reference` | The reference you supplied when creating the account. |
| `data.transaction_reference` | Cray's reference for this individual collection. Use it to deduplicate processing. |
| `data.processorReference` | Provider payment/order reference. |
| `data.recipient` | The receiving account number. |
| `data.amount`, `data.charge`, `data.netAmount` | Gross collection amount, fee and net amount. |
| `data.status` | Collection status, for example `Successful` or `Failed`. |
| `hash` | Base64-encoded HMAC-SHA256 of the JSON-encoded `data` object, using your API key with the `webhook` scope. Preserve field order and number formatting when checking the signature. |

A successful webhook means the collection is confirmed; the wallet credit is processed asynchronously afterwards. Handle duplicate notifications idempotently. See [Webhooks](/v2/cray-docs/webhooks) for signature verification.

### Validation and errors

An invalid currency, account type, amount, expiry or identity format returns a validation error, normally HTTP `422`. Authentication, access and provider failures return other non-2xx responses. Check the HTTP status, the error message and the returned account details rather than assuming every response contains an account.

Never ship provider credentials or your API keys to your customer's browser. Your server calls the Cray API with its API key.

---

## List all Virtual Accounts

URL: https://docs.crayfi.com/v2/collections/list-virtual-accounts

Method: `GET`

Endpoint: `GET {{base_url}}/virtual-accounts`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Fetches all virtual accounts created under the authenticated merchant, with optional filters (status, validity_type, provider, currency, date range, free-text search) and pagination.



---

## Get Subaccounts

URL: https://docs.crayfi.com/v2/collections/get-subaccounts

Method: `GET`

Endpoint: `GET {{base_url}}/get-subaccount`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

List of all subaccounts currently associated with your primary Cray account.



---

## Initiate Card Transaction

URL: https://docs.crayfi.com/v2/collections/initiate-card

Method: `POST`

Endpoint: `POST {{base_url}}/initiate`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The Initiate endpoint begins a new payment flow by securely creating a transaction session with all specified parameters (card details, amount, customer info, etc.). This request establishes the foundation for subsequent payment operations, returning a unique identifier that must be referenced throughout the transaction lifecycle.



---

## Process Payment

URL: https://docs.crayfi.com/v2/collections/process-payment

Method: `POST`

Endpoint: `POST {{base_url}}/charge`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The Charge endpoint processes payment transactions against customer payment methods, capturing funds for products or services. This essential endpoint supports multiple currencies, custom metadata, and provides detailed response data including authorization status and transaction identifiers.



---

## Query Transaction

URL: https://docs.crayfi.com/v2/collections/query-transaction

Method: `GET`

Endpoint: `GET {{base_url}}/query/{reference}`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The Query Transaction endpoint lets you pull up all the detailed info about any transaction using its unique ID. This is your go-to tool for easily checking payment statuses, amounts, and everything you need for quick reconciliation and monitoring



---

## Initiate

URL: https://docs.crayfi.com/v2/collections/initiate-mobile-money

Method: `POST`

Endpoint: `POST {{base_url}}/momo/initiate`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Trigger a payment request to a user’s mobile wallet



---

## Requery

URL: https://docs.crayfi.com/v2/collections/requery-mobile-money

Method: `GET`

Endpoint: `GET {{base_url}}/momo/requery/{reference}`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Your quick check-in to see exactly what happened with a Mobile Money transaction



---

## Get Supported Assets

URL: https://docs.crayfi.com/v2/collections/get-supported-assets

Method: `GET`

Endpoint: `GET {{base_url}}/virtual-accounts/crypto/supported-assets`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Fetch the list of supported crypto assets. Each asset returns an assetId tied to a specific blockchain network. Always call this first — never hardcode asset IDs.



---

## Create Vault/Asset

URL: https://docs.crayfi.com/v2/collections/create-vault

Method: `POST`

Endpoint: `POST {{base_url}}/accounts/crypto/vault`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Create a crypto vault for your customer. Provide a unique name and a valid assetId from the Get Supported Assets endpoint. Returns a deposit address the customer can send funds to.



---

# Payouts

## Payouts

URL: https://docs.crayfi.com/v2/payouts

This guide provides a developer-focused walkthrough of the Cray Payouts API. Integrating our payout functionality involves a series of API calls designed to ensure accuracy, security, and a smooth user experience. Following this workflow will help you build a robust payout system.

### Supported Payout Currencies

Our platform supports payouts in the following currencies:

* **ZMW**: Zambia
* **USD**: United States
* **USDT**: Tether (stablecoin)
* **GHS**: Ghana
* **MZN**: Mozambique
* **NGN**: Nigeria
* **XOF**: West African CFA
* **XAF**: Central African CFA
* **GBP**: United Kingdom
* **EUR**: Eurozone
* **CAD**: Canada

### Payout Process Overview

The payout workflow is designed to be sequential and idempotent. Each step provides necessary information for the next, culminating in the final disbursement. The core process is as follows:

1. **Fetch Supported Banks**: Retrieve an up-to-date list of supported banks for bank transfer operations.
2. **Validate Beneficiary Account**: Perform a pre-transaction check to verify account details and receive a reference ID.
3. **Initiate Disbursement**: Execute the payout transaction using the reference ID to send funds to the recipient.
4. **Requery Transaction Status**: Asynchronously check the final status of the payout.

---

### 1. Fetch Supported Banks

**Endpoint**: `GET /payout/banks`

For bank transfer payouts, it's crucial to provide users with an accurate list of supported institutions. This endpoint returns a comprehensive list of all banks integrated with our system. It requires no parameters.

---

### 2. Validate Beneficiary Account

**Endpoint**: `POST /payout/accounts/validate`

To prevent failed transactions, validate the beneficiary's account details before attempting a disbursement. By submitting the user's account number and bank code, the API returns the registered account name and a unique reference ID (`ref_id`) for the validation session. **This ID is required to process the transaction in the next step.**

#### Request Body

* `account_number` (string, required): The beneficiary's bank account number.
* `bank_code` (string, required): The unique code for the beneficiary's bank, retrieved from the `GET /payout/banks` endpoint.

#### Example Payload

```json
{
  "account_number": "0123456789",
  "bank_code": "000013"
}
```

The response will contain a `ref_id` in the data object, which you must pass to the disbursement endpoint.

---

### 3. Initiate Disbursement

**Endpoint**: `POST /payout/disburse`

Once the account is validated, you can initiate the payout. This endpoint processes the actual fund transfer to the recipient's account. The `ref_id` from the validation step must be included in the request to link the disbursement to a verified account.

#### Example Payload

* `customer_reference` (string, required): A unique identifier for the transaction from your system.
* `amount` (number, required): The amount to be disbursed.
* `narration` (string, required): A brief description of the transaction.
* `ref_id` (string, required): The reference ID obtained from the account validation step. This links the disbursement to a successful validation.

The exact structure of the payload will vary depending on the payout currency. The example below is for a disbursement in **XOF**. You can test the endpoint on the process transfer page listed on the sidebar menu to see other currencies' payload.

**XOF-specific requirements:**
* Minimum amount: **200**
* `receipient_info.bank_code` must be one of: `orange`, `mtn`, `moov`, `wave`, `free`, `expresso`, `t-money`, `wizall`
* `receipient_info.country` is **required** and must be one of: `senegal`, `ivory coast`, `cameroon`, `benin`, `togo`, `burkina faso`, `mali`
* Cameroon payouts use **XAF**, not XOF. They follow the same payload, with `currency` set to `XAF`.
* The accepted `bank_code` values depend on the `country` selected — see the Process Transfer page for the full country-to-provider mapping.
* **Orange Money OTP:** when `receipient_info.bank_code` is `orange` AND `receipient_info.country` is `senegal` OR `burkina faso`, you **must** pass an additional field `receipient_info.om_otp` (string, 4-10 digits) inside the `receipient_info` object. It contains the Orange Money one-time code generated by the sender's Orange Money wallet. Omit this nested field for all other XOF payout providers/countries.

```json
{
    "amount": 5000,
    "currency": "XOF",
    "account_number": "770000000",
    "customer_reference": "PDN-PAYOUT-001",
    "narration": "Payout",
    "receipient_info": {
      "account_number": "770000000",
      "bank_code": "orange",
      "country": "senegal",
      "om_otp": "123456"
    }
  }
```

**MZN-specific requirements (Mozambique):**
* `receipient_info.bank_code` is the **wallet** name, not the carrier — a Vodacom line always uses M-Pesa, a Movitel line always uses e-Mola, and a Tmcel line always uses mKesh

| `bank_code` | Carrier | Wallet | Number prefix | Status      |
| ------------ | ------- | ------ | ------------- | ----------- |
| `mpesa`     | Vodacom | M-Pesa | 84            | Available   |
| `emola`     | Movitel | e-Mola | 87            | Available   |
| `mkesh`     | Tmcel   | mKesh  | 82            | Available   |

* `receipient_info.country` is **not required** — the destination country is implied by the currency
* `account_number` is the recipient's phone number, in international (`258846930527`) or local nine-digit (`846930527`) format
* Values are case-sensitive
* There is no minimum amount

```json
{
    "amount": 500,
    "currency": "MZN",
    "account_number": "258846930527",
    "customer_reference": "MZ-PAYOUT-001",
    "narration": "Payout",
    "receipient_info": {
      "account_number": "258846930527",
      "bank_code": "mpesa"
    }
  }
```

#### Sample Response (200 — Queued)

The endpoint returns immediately once the payout is queued. The `status` will be `pending` — you'll be notified of the final outcome via the `payout` webhook. Use the `reference` field to reconcile on your side.

```json
{
  "success": true,
  "data": {
    "reference": "76F38215SRTXENH1759359170",
    "amount": "5000",
    "charge": 50,
    "status": "pending",
    "recipient_name": null,
    "recipient_bank_code": "orange",
    "recipient_account_number": "770000000",
    "processor_reference": null,
    "merchant_reference": "PDN-PAYOUT-001"
  },
  "message": "Action was successfull"
}
```

#### Error Responses

| Status | Scenario | Message |
| --- | --- | --- |
| `400` | Insufficient wallet balance | `Insufficient balance` |
| `403` | Payout feature not enabled on the account | `Feature not available` |
| `422` | Amount below XOF minimum | `The minimum amount for XOF disbursements is 200.` |
| `422` | Invalid `bank_code` or `country` for XOF | Validation errors returned in `errors` object |
| `422` | Invalid `bank_code` for MZN | `The selected bank code is invalid. MZN payouts support mpesa, emola and mkesh.` |

---

### 4. Requery Transaction Status

**Endpoint**: `GET /payout/requery/{transaction_id}`

Payouts are often processed asynchronously. After initiating a disbursement, use this endpoint to determine its final status.

#### URL Parameters

* `transaction_id` (string, required): The unique transaction ID returned by the `POST /payout/disburse` endpoint.

---

## Fiat Payout

URL: https://docs.crayfi.com/v2/payouts/fiat-payout

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Send payouts in fiat currency directly to bank accounts and mobile money wallets.

Single currency payouts allow businesses to send and receive funds in the same currency. In this type of payout, the currency used by the sender is the same currency the recipient receives, meaning no currency conversion is required during the transaction.

This payout method is typically used for domestic payments within supported countries, where both the sender and recipient operate in the same currency. For example, a business can send funds in NGN, and the recipient receives the payout in NGN through their local bank account.

Single currency payouts are commonly used for local vendor payments, agent settlements, merchant withdrawals, and other domestic disbursements, providing a simple and efficient way to transfer funds without involving exchange rates or cross-border conversions.

### Get Banks

The **Get Banks** endpoint returns a comprehensive list of all supported banks — useful for populating bank options during user onboarding or when setting up payout and transfer operations, helping ensure accuracy and cut down on input errors.

| Method | URL |
| ------ | -------------- |
| GET | /payout/banks |

**Query Parameters:**

| Parameter | Description |
| ----------- | -------------------------------------------------------------------------- |
| countryCode | Leave it out for Nigerian banks. Use "GH" for Ghanaian banks and mobile money providers. |

**Example request:**

```bash
# Nigerian banks
curl --request GET \
  --url '{{base_url}}/payout/banks' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'

# Ghanaian banks
curl --request GET \
  --url '{{base_url}}/payout/banks?countryCode=GH' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "data": [
    {
      "bank_name": "ACCESS BANK PLC",
      "short_code": "000014",
      "bank_code": "000014",
      "institutionCode": "000014",
      "institutionName": "ACCESS BANK PLC"
    }
  ],
  "message": "Action was Succesfull"
}
```

### Account Name Lookup

The **Account Name Lookup** endpoint validates a bank account number instantly using just the account number and bank code, returning the corresponding account name so you can confirm the beneficiary's details before processing a payout.

| Method | URL |
| ------ | ------------------------ |
| POST | /payout/accounts/validate |

**Request body payload:**

| Parameter | Required | Description | Example |
| -------------- | -------- | -------------------------------------------------------------- | ------------ |
| account_number | Yes | The recipient's bank account number to verify. | "0123456789" |
| bank_code | Yes | The bank code from Get Banks. | "000013" |
| country_code | Ghana only | Send "GH" for Ghanaian accounts. Leave it out for Nigeria; the lookup fails if it is sent. | "GH" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/accounts/validate' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "account_number": "0123456789",
  "bank_code": "000013"
}'
```

**Example request (Ghana):**

```bash
curl --request POST \
  --url '{{base_url}}/payout/accounts/validate' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "account_number": "0200955183017",
  "bank_code": "RPB",
  "country_code": "GH"
}'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "account_number": "0123456789",
    "account_name": "test user",
    "ref_id": "sess_6ad78ff6f128b30afd238964"
  },
  "message": "Action was Succesfull"
}
```

### Process Transfer

The **Process Transfer** endpoint sends money from your merchant wallet directly into a beneficiary's bank account. It requires your API key for authorization and accepts a JSON payload containing the transfer amount, a unique customer reference, the destination bank code, account number, and an optional narration — ensuring every transfer is traceable and processed quickly.

| Method | URL |
| ------ | --------------- |
| POST | /payout/disburse |

**Request body payload:**

| Parameter | Required | Description | Example |
| ------------------------------- | -------- | -------------------------------------------------- | ---------------------- |
| customer_reference | Yes | Unique reference for the payout. | "your_unique_reference" |
| account_number | Yes | Destination bank account number. | "0123456789" |
| bank_code | Yes | The destination bank code from Get Banks. | "000013" |
| amount | Yes | Amount to transfer. | "5000" |
| narration | No | Description for the transfer. | "testing" |
| recipient_name | Yes | Account name returned by Account Name Lookup. | "test user" |
| ref_id | Yes | The ref_id returned by Account Name Lookup. Run a fresh lookup right before each payout. | "sess_6ad78ff6f128b30afd238964" |
| currency | Yes | Currency code. | "NGN" |
| sender_info.name | No | Sender's name. | "Acme Ltd" |
| sender_info.phone | No | Sender's phone number. | "+2348012345678" |
| sender_info.email | No | Sender's email address. | "ops@acme.com" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/disburse' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "customer_reference": "your_unique_reference",
  "account_number": "0123456789",
  "bank_code": "000013",
  "amount": "5000",
  "narration": "testing",
  "recipient_name": "test user",
  "ref_id": "sess_6ad78ff6f128b30afd238964",
  "currency": "NGN",
  "sender_info": {
    "name": "Acme Ltd",
    "phone": "+2348012345678",
    "email": "ops@acme.com"
  }
}'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "reference": "76F38215SRTXENH1759359170",
    "amount": "5000",
    "charge": 50,
    "status": "pending",
    "recipient_name": null,
    "recipient_bank_code": "000013",
    "recipient_account_number": "0123456789",
    "processor_reference": null,
    "merchant_reference": "your_unique_reference"
  },
  "message": "Action was successfull"
}
```

### Verify Transaction

The **Verify Transaction** endpoint lets you instantly check the status of a payout you've sent, using its unique `transaction_id` as a path parameter — confirming whether a disbursement was successful, pending, or failed.

| Method | URL |
| ------ | ------------------------------------ |
| GET | /payout/requery/{transaction_id} |

**Path Parameters:**

| Parameter | Description |
| -------------- | -------------------------------------------------------- |
| transaction_id | Unique transaction ID returned from Process Transfer. |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/requery/76F38215SRTXENH1759359170' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "reference": "76F38215SRTXENH1759359170",
    "amount": "5000",
    "charge": "50.00",
    "status": "approved",
    "recipient_name": "JOHN DOE",
    "recipient_bank_code": "000013",
    "recipient_account_number": "0123456789",
    "processor_reference": "76F38215SRTXENH1759359170",
    "merchant_reference": "your_unique_reference"
  },
  "message": "Action was Succesfull"
}
```

  
  

Cross-currency payouts allow businesses to send money in one currency while the recipient receives it in another currency. The platform automatically performs the currency conversion using the applicable exchange rate before completing the payout.

This feature is useful for cross-border payments, where the sender operates in a different currency from the recipient. For example, a business can send funds from its NGN wallet, while the recipient receives the payout in GHS in their local bank account.

Cross-currency payouts support **NGN, GHS, KES, XOF and ZMW**. Bank account payouts are available for recipients in Nigeria (NGN) and Ghana (GHS).

A cross-currency payout takes five steps:

1. **Get Banks** — find the recipient's bank code.
2. **Verify Account** — confirm the account name and get a `ref_id`.
3. **Get Rate** — get a quote and its `quote_id`.
4. **Disburse** — send the payout using the quote and the `ref_id`.
5. **Check Status** — follow the payout until it completes or fails.

### Get Banks

Use the same **Get Banks** endpoint as single-currency payouts. Leave out `countryCode` for Nigerian banks and send `countryCode=GH` for Ghanaian banks.

| Method | URL |
| ------ | -------------- |
| GET | /payout/banks |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/banks?countryCode=GH' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

### Verify Account

Confirms the recipient's account name and returns a `ref_id`. The `ref_id` is short-lived; pass it unchanged in the `beneficiary` object when you disburse.

| Method | URL |
| ------ | ----------------------- |
| POST | /payout/verify-account |

**Request body payload:**

| Parameter | Required | Description | Example |
| -------------- | ---------- | -------------------------------------------------------------- | --------------- |
| account_number | Yes | The recipient's bank account number. | "0200955183017" |
| bank_code | Yes | The bank code from Get Banks. | "RPB" |
| country_code | Ghana only | Send "GH" for Ghanaian accounts. Leave it out for every other country; the lookup fails if it is sent. | "GH" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/verify-account' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "account_number": "0200955183017",
  "bank_code": "RPB",
  "country_code": "GH"
}'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "account_number": "0200955183017",
    "account_name": "JOHN DOE",
    "ref_id": "sess_6ad78ff6f128b30afd238964"
  },
  "message": "Action was Succesfull"
}
```

### Get Rate

Returns a quote for converting the source amount into the target currency. The quote expires after `expires_in_minutes` (10 minutes); get a new one if it expires before you disburse.

| Method | URL |
| ------ | ----------------------------- |
| GET | /payout/cross-currency/rate |

**Query Parameters:**

| Parameter | Required | Description | Example |
| --------------- | -------- | ---------------------------------------------------- | -------- |
| source_currency | Yes | The currency debited from your wallet. | "NGN" |
| target_currency | Yes | The currency the recipient receives. | "GHS" |
| amount | Yes | The amount to send, in the source currency, in major units. | "20000.00" |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/cross-currency/rate?source_currency=NGN&target_currency=GHS&amount=20000.00' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "message": "Quote generated",
  "data": {
    "quote_id": "cc_quote:3f1c2b9e-8a4d-4c71-9e2a-5b6d7c8e9f01",
    "source_currency": "NGN",
    "target_currency": "GHS",
    "source_amount": 20000,
    "rate": 0.0078,
    "destination_amount": 156,
    "created_at": "2026-10-21T10:00:00Z",
    "expires_in_minutes": 10
  }
}
```

### Disburse

Sends the payout using the quote from Get Rate. The `amount` must exactly match the quoted `source_amount`, or the request is rejected with a 422. Send an `Idempotency-Key` header so a retried request is not paid twice.

| Method | URL |
| ------ | --------------------------------- |
| POST | /payout/cross-currency/disburse |

**Headers:**

| Header | Required | Description |
| --------------- | -------- | ------------------------------------------------------------ |
| Idempotency-Key | Yes | A unique value per payout. Reuse it only when retrying the same payout. |

**Request body payload:**

| Parameter | Required | Description | Example |
| ---------------- | -------- | ---------------------------------------------------------------- | ------------------------------- |
| quote_id | Yes | The `quote_id` from Get Rate. | "cc_quote:3f1c2b9e-..." |
| source_currency | Yes | Must match the quote. | "NGN" |
| target_currency | Yes | Must match the quote. | "GHS" |
| amount | Yes | The source amount as a number, in major units. Must match the quote. | 20000 |
| payout_reference | Yes | Your unique reference for this payout. | "CCP-20261021-0001" |
| beneficiary | Yes | The recipient's details (see below). | |

**Beneficiary object:**

| Parameter | Required | Description | Example |
| -------------- | ---------- | ---------------------------------------------------- | ------------------------------ |
| account_type | Yes | Use "bank_account". | "bank_account" |
| account_number | Yes | The recipient's bank account number. | "0200955183017" |
| bank_code | Yes | The bank code from Get Banks. | "RPB" |
| name | Yes | The `account_name` from Verify Account. | "JOHN DOE" |
| ref_id | Yes | The `ref_id` from Verify Account. | "sess_6ad78ff6f128b30afd238964" |
| country_code | Ghana only | Send "GH" for Ghanaian accounts. | "GH" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/cross-currency/disburse' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'Idempotency-Key: CCP-20261021-0001' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "quote_id": "cc_quote:3f1c2b9e-8a4d-4c71-9e2a-5b6d7c8e9f01",
  "source_currency": "NGN",
  "target_currency": "GHS",
  "amount": 20000,
  "payout_reference": "CCP-20261021-0001",
  "beneficiary": {
    "account_type": "bank_account",
    "account_number": "0200955183017",
    "bank_code": "RPB",
    "name": "JOHN DOE",
    "country_code": "GH",
    "ref_id": "sess_6ad78ff6f128b30afd238964"
  }
}'
```

**Example response (202):**

```json
{
  "success": true,
  "message": "Payout execution dispatched",
  "data": {
    "reference": "PAY-7F3A9C21B4",
    "status": "pending",
    "source_currency": "NGN",
    "target_currency": "GHS",
    "amount": "20000.00"
  }
}
```

Save `data.reference`. You need it to check the payout's status.

### Check Status

Returns the payout's overall status and each processing step. Use the `reference` from the Disburse response, not your `payout_reference`.

| Method | URL |
| ------ | ---------------------------------------------- |
| GET | /payout/cross-currency/status/{reference} |

**Path Parameters:**

| Parameter | Description |
| --------- | ---------------------------------------------- |
| reference | The `reference` returned by Disburse, for example "PAY-7F3A9C21B4". |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/cross-currency/status/PAY-7F3A9C21B4' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "id": 1024,
    "payout_reference": "CCP-20261021-0001",
    "status": "completed",
    "source_currency": "NGN",
    "target_currency": "GHS",
    "amount": "20000.00",
    "current_step_sequence_no": 2,
    "started_at": "2026-10-21T10:01:02Z",
    "completed_at": "2026-10-21T10:01:40Z",
    "steps": [
      {
        "sequence_no": 1,
        "step_type": "conversion",
        "status": "completed",
        "attempt_no": 1,
        "provider_reference": "CNV-91B2C3",
        "error": null,
        "started_at": "2026-10-21T10:01:02Z",
        "completed_at": "2026-10-21T10:01:15Z"
      },
      {
        "sequence_no": 2,
        "step_type": "payout",
        "status": "completed",
        "attempt_no": 1,
        "provider_reference": "76F38215SRTXENH1759359170",
        "error": null,
        "started_at": "2026-10-21T10:01:15Z",
        "completed_at": "2026-10-21T10:01:40Z"
      }
    ]
  },
  "message": "Action was Succesfull"
}
```

The payout is final when `status` is completed or failed. If a step fails, its `error` field explains why. An unknown reference returns:

```json
{
  "success": false,
  "data": null,
  "message": "No execution found for reference"
}
```

  
  

Bulk payouts allow businesses to send multiple payouts to different recipients in a single API request. Instead of creating separate payout requests for each recipient, bulk payouts enable you to submit a batch of payout instructions at once, improving efficiency and reducing the number of API calls required.

This feature is commonly used for payroll disbursements, marketplace seller payouts, affiliate commissions, vendor payments, and mass refunds. By processing multiple transactions in a single request, businesses can streamline payment operations and handle large-scale disbursements more effectively.

Each payout in the batch contains its own recipient details, amount, and reference, while the platform processes the entire list as part of a single bulk payout operation. This approach simplifies reconciliation and makes it easier to manage high-volume payment workflows.

  

  
  

  

Single currency payouts allow businesses to send and receive funds in the same currency. In this type of payout, the currency used by the sender is the same currency the recipient receives, meaning no currency conversion is required during the transaction.

This payout method is typically used for domestic payments within supported countries, where both the sender and recipient operate in the same currency. For example, a business can send funds in XOF, and the recipient receives the payout in XOF through their mobile money wallet or local account.

Single currency payouts are commonly used for local vendor payments, agent settlements, merchant withdrawals, and other domestic disbursements, providing a simple and efficient way to transfer funds without involving exchange rates or cross-border conversions.
Mobile Money payouts are currently available in **Ghana, Kenya, Ivory Coast, Senegal, Cameroon, Benin Republic, Togo, Burkina Faso, and Mali**.

### Get Banks

The **Get Banks** endpoint returns a comprehensive list of all supported banks — useful for populating bank options during user onboarding or when setting up payout and transfer operations, helping ensure accuracy and cut down on input errors.

| Method | URL |
| ------ | -------------- |
| GET | /payout/banks |

**Query Parameters:**

| Parameter | Description |
| ----------- | -------------------------------------------------------------------------- |
| countryCode | Leave it out for Nigerian banks. Use "GH" for Ghanaian banks and mobile money providers. |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/banks?countryCode=GH' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "data": [
    {
      "bank_name": "MTN MOBILE MONEY",
      "short_code": "MTN",
      "bank_code": "MTN",
      "institutionCode": "MTN",
      "institutionName": "MTN MOBILE MONEY"
    }
  ],
  "message": "Action was Succesfull"
}
```

### Account Name Lookup

The **Account Name Lookup** endpoint validates a bank account number instantly using just the account number and bank code, returning the corresponding account name so you can confirm the beneficiary's details before processing a payout.

| Method | URL |
| ------ | ------------------------ |
| POST | /payout/accounts/validate |

**Request body payload:**

| Parameter | Required | Description | Example |
| -------------- | -------- | -------------------------------------------------------------- | ------------ |
| account_number | Yes | The recipient's mobile money number to verify. | "233556460184" |
| bank_code | Yes | The mobile money provider code from Get Banks. | "MTN" |
| country_code | Yes | The country code, for example "GH". | "GH" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/accounts/validate' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "account_number": "233556460184",
  "bank_code": "MTN",
  "country_code": "GH"
}'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "account_number": "233556460184",
    "account_name": "test user",
    "ref_id": "sess_6ad78ff5f128b30afd238963"
  },
  "message": "Action was Succesfull"
}
```

### Process Transfer

The **Process Transfer** endpoint sends money from your merchant wallet directly into a beneficiary's mobile money wallet. It requires your API key for authorization and accepts a JSON payload containing the transfer amount, a unique customer reference, the destination provider code, account number, and an optional narration — ensuring every transfer is traceable and processed quickly.

| Method | URL |
| ------ | --------------- |
| POST | /payout/disburse |

**Request body payload:**

| Parameter | Required | Description | Example |
| ------------------------------- | -------- | -------------------------------------------------- | ---------------------- |
| amount | Yes | Amount to transfer. | "5000" |
| currency | Yes | Currency code. | "XAF" |
| account_number | Yes | Destination mobile money account number. | "670000000" |
| customer_reference | Yes | Unique reference for the payout. | "your_unique_reference" |
| narration | No | Description for the transfer. | "testing" |
| receipient_info.account_number | Yes | Recipient mobile money account number. | "670000000" |
| receipient_info.bank_code | Yes | The mobile money provider code. | "mtn" |
| receipient_info.country | Yes | Country where the payout is being made. | "cameroon" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/disburse' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "amount": 5000,
  "currency": "XAF",
  "account_number": "670000000",
  "customer_reference": "your_unique_reference",
  "narration": "testing",
  "receipient_info": {
    "account_number": "670000000",
    "bank_code": "mtn",
    "country": "cameroon"
  }
}'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "reference": "76F38215SRTXENH1759359170",
    "amount": "5000",
    "charge": 50,
    "status": "pending",
    "recipient_name": null,
    "recipient_bank_code": "mtn",
    "recipient_account_number": "670000000",
    "processor_reference": null,
    "merchant_reference": "your_unique_reference"
  },
  "message": "Action was successfull"
}
```

### Verify Transaction

The **Verify Transaction** endpoint lets you instantly check the status of a payout you've sent, using its unique `transaction_id` as a path parameter — confirming whether a disbursement was successful, pending, or failed.

| Method | URL |
| ------ | ------------------------------------ |
| GET | /payout/requery/{transaction_id} |

**Path Parameters:**

| Parameter | Description |
| -------------- | -------------------------------------------------------- |
| transaction_id | Unique transaction ID returned from Process Transfer. |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/requery/76F38215SRTXENH1759359170' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "reference": "76F38215SRTXENH1759359170",
    "amount": "5000",
    "charge": "50.00",
    "status": "approved",
    "recipient_name": "JOHN DOE",
    "recipient_bank_code": "mtn",
    "recipient_account_number": "670000000",
    "processor_reference": "76F38215SRTXENH1759359170",
    "merchant_reference": "your_unique_reference"
  },
  "message": "Action was Succesfull"
}
```

  
  

Cross-currency payouts allow businesses to send money in one currency while the recipient receives it in another currency. The platform automatically performs the currency conversion using the applicable exchange rate before completing the payout.

This feature is useful for cross-border payments, where the sender operates in a different currency from the recipient. For example, a business can send funds from its NGN wallet, while the recipient receives the payout in GHS in their mobile money wallet.

Cross-currency payouts support **NGN, GHS, KES, XOF and ZMW**. Mobile money payouts are available for recipients in Ghana (GHS), Kenya (KES) and XOF countries.

A cross-currency mobile money payout takes five steps:

1. **Get Banks** — find the mobile money provider's code.
2. **Verify Account** — confirm the wallet holder's name and get a `ref_id`.
3. **Get Rate** — get a quote and its `quote_id`.
4. **Disburse** — send the payout using the quote and the `ref_id`.
5. **Check Status** — follow the payout until it completes or fails.

### Get Banks

Use the same **Get Banks** endpoint as single-currency payouts. Send `countryCode=GH` to list Ghanaian mobile money providers.

| Method | URL |
| ------ | -------------- |
| GET | /payout/banks |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/banks?countryCode=GH' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

### Verify Account

Confirms the wallet holder's name and returns a `ref_id`. The `ref_id` is short-lived; pass it unchanged in the `beneficiary` object when you disburse.

| Method | URL |
| ------ | ----------------------- |
| POST | /payout/verify-account |

**Request body payload:**

| Parameter | Required | Description | Example |
| -------------- | ---------- | -------------------------------------------------------------- | ---------------- |
| account_number | Yes | The recipient's mobile money number, with country calling code. | "+233556460184" |
| bank_code | Yes | The mobile money provider code from Get Banks. | "MTN" |
| country_code | Ghana only | Send "GH" for Ghanaian wallets. Leave it out for every other country; the lookup fails if it is sent. | "GH" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/verify-account' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "account_number": "+233556460184",
  "bank_code": "MTN",
  "country_code": "GH"
}'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "account_number": "+233556460184",
    "account_name": "JOHN DOE",
    "ref_id": "sess_6ad78ff6f128b30afd238964"
  },
  "message": "Action was Succesfull"
}
```

### Get Rate

Returns a quote for converting the source amount into the target currency. The quote expires after `expires_in_minutes` (10 minutes); get a new one if it expires before you disburse.

| Method | URL |
| ------ | ----------------------------- |
| GET | /payout/cross-currency/rate |

**Query Parameters:**

| Parameter | Required | Description | Example |
| --------------- | -------- | ---------------------------------------------------- | -------- |
| source_currency | Yes | The currency debited from your wallet. | "NGN" |
| target_currency | Yes | The currency the recipient receives. | "GHS" |
| amount | Yes | The amount to send, in the source currency, in major units. | "20000.00" |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/cross-currency/rate?source_currency=NGN&target_currency=GHS&amount=20000.00' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "message": "Quote generated",
  "data": {
    "quote_id": "cc_quote:3f1c2b9e-8a4d-4c71-9e2a-5b6d7c8e9f01",
    "source_currency": "NGN",
    "target_currency": "GHS",
    "source_amount": 20000,
    "rate": 0.0078,
    "destination_amount": 156,
    "created_at": "2026-10-21T10:00:00Z",
    "expires_in_minutes": 10
  }
}
```

### Disburse

Sends the payout using the quote from Get Rate. The `amount` must exactly match the quoted `source_amount`, or the request is rejected with a 422. Send an `Idempotency-Key` header so a retried request is not paid twice.

| Method | URL |
| ------ | --------------------------------- |
| POST | /payout/cross-currency/disburse |

**Headers:**

| Header | Required | Description |
| --------------- | -------- | ------------------------------------------------------------ |
| Idempotency-Key | Yes | A unique value per payout. Reuse it only when retrying the same payout. |

**Request body payload:**

| Parameter | Required | Description | Example |
| ---------------- | -------- | ---------------------------------------------------------------- | ------------------------------- |
| quote_id | Yes | The `quote_id` from Get Rate. | "cc_quote:3f1c2b9e-..." |
| source_currency | Yes | Must match the quote. | "NGN" |
| target_currency | Yes | Must match the quote. | "GHS" |
| amount | Yes | The source amount as a number, in major units. Must match the quote. | 20000 |
| payout_reference | Yes | Your unique reference for this payout. | "CCP-20261021-0001" |
| beneficiary | Yes | The recipient's details (see below). | |

**Beneficiary object:**

| Parameter | Required | Description | Example |
| ------------ | ---------- | ---------------------------------------------------- | ------------------------------ |
| account_type | Yes | Use "mobile_money". | "mobile_money" |
| phone | Yes | The recipient's mobile money number, as sent to Verify Account. | "+233556460184" |
| name | Yes | The `account_name` from Verify Account. | "JOHN DOE" |
| ref_id | Yes | The `ref_id` from Verify Account. | "sess_6ad78ff6f128b30afd238964" |
| bank_code | No | The mobile money provider code from Get Banks. | "MTN" |
| country_code | Ghana only | Send "GH" for Ghanaian wallets. | "GH" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/cross-currency/disburse' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'Idempotency-Key: CCP-20261021-0001' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "quote_id": "cc_quote:3f1c2b9e-8a4d-4c71-9e2a-5b6d7c8e9f01",
  "source_currency": "NGN",
  "target_currency": "GHS",
  "amount": 20000,
  "payout_reference": "CCP-20261021-0001",
  "beneficiary": {
    "account_type": "mobile_money",
    "phone": "+233556460184",
    "name": "JOHN DOE",
    "bank_code": "MTN",
    "country_code": "GH",
    "ref_id": "sess_6ad78ff6f128b30afd238964"
  }
}'
```

**Example response (202):**

```json
{
  "success": true,
  "message": "Payout execution dispatched",
  "data": {
    "reference": "PAY-7F3A9C21B4",
    "status": "pending",
    "source_currency": "NGN",
    "target_currency": "GHS",
    "amount": "20000.00"
  }
}
```

Save `data.reference`. You need it to check the payout's status.

### Check Status

Returns the payout's overall status and each processing step. Use the `reference` from the Disburse response, not your `payout_reference`.

| Method | URL |
| ------ | ---------------------------------------------- |
| GET | /payout/cross-currency/status/{reference} |

**Path Parameters:**

| Parameter | Description |
| --------- | ---------------------------------------------- |
| reference | The `reference` returned by Disburse, for example "PAY-7F3A9C21B4". |

**Example request:**

```bash
curl --request GET \
  --url '{{base_url}}/payout/cross-currency/status/PAY-7F3A9C21B4' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "id": 1024,
    "payout_reference": "CCP-20261021-0001",
    "status": "completed",
    "source_currency": "NGN",
    "target_currency": "GHS",
    "amount": "20000.00",
    "current_step_sequence_no": 2,
    "started_at": "2026-10-21T10:01:02Z",
    "completed_at": "2026-10-21T10:01:40Z",
    "steps": [
      {
        "sequence_no": 1,
        "step_type": "conversion",
        "status": "completed",
        "attempt_no": 1,
        "provider_reference": "CNV-91B2C3",
        "error": null,
        "started_at": "2026-10-21T10:01:02Z",
        "completed_at": "2026-10-21T10:01:15Z"
      },
      {
        "sequence_no": 2,
        "step_type": "payout",
        "status": "completed",
        "attempt_no": 1,
        "provider_reference": "76F38215SRTXENH1759359170",
        "error": null,
        "started_at": "2026-10-21T10:01:15Z",
        "completed_at": "2026-10-21T10:01:40Z"
      }
    ]
  },
  "message": "Action was Succesfull"
}
```

The payout is final when `status` is completed or failed. If a step fails, its `error` field explains why. An unknown reference returns:

```json
{
  "success": false,
  "data": null,
  "message": "No execution found for reference"
}
```

  
  

Bulk payouts allow businesses to send multiple payouts to different recipients in a single API request. Instead of creating separate payout requests for each recipient, bulk payouts enable you to submit a batch of payout instructions at once, improving efficiency and reducing the number of API calls required.

This feature is commonly used for payroll disbursements, marketplace seller payouts, affiliate commissions, vendor payments, and mass refunds. By processing multiple transactions in a single request, businesses can streamline payment operations and handle large-scale disbursements more effectively.

Each payout in the batch contains its own recipient details, amount, and reference, while the platform processes the entire list as part of a single bulk payout operation. This approach simplifies reconciliation and makes it easier to manage high-volume payment workflows.

  

  
  

USD, EUR and GBP payouts send funds from your merchant wallet to a recipient's bank account. You can save the recipient as a beneficiary first, then send the payout.

### Add Beneficiary

Saves a recipient's bank account. The same fields are used for USD, EUR and GBP; set `currency` to the payout currency.

| Method | URL |
| ------ | --------------------------- |
| POST | /payout/fiat/beneficiaries |

**Request body payload:**

| Parameter | Required | Description | Example |
| ------------------ | -------- | ------------------------------------------------------------------ | -------------------------- |
| account_owner_name | Yes | Full name of the bank account owner. | "Ada" |
| account_owner_type | Yes | `individual` or `business`. | "individual" |
| business_name | No | Business name. Required when `account_owner_type` is `business`. | "" |
| currency | Yes | `USD`, `EUR` or `GBP`. | "USD" |
| account_number | Yes | Recipient's bank account number. | "123456789012" |
| routing_number | Yes | Recipient bank's routing number. | "021000021" |
| account_type | Yes | Bank account type. | "us" |
| bank_name | Yes | Name of the recipient's bank. | "Fictitious National Bank" |
| street_line_1 | Yes | Account owner's street address. | "1 Example St" |
| city | Yes | Account owner's city. | "New York" |
| state | Yes | Account owner's state. | "NY" |
| postal_code | Yes | Account owner's postal code. | "10001" |
| country | Yes | Account owner's country. | "USA" |

**Example request:**

```bash
curl --request POST \
  --url '{{base_url}}/payout/fiat/beneficiaries' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "account_owner_name": "Ada",
  "account_owner_type": "individual",
  "business_name": "",
  "currency": "USD",
  "account_number": "123456789012",
  "routing_number": "021000021",
  "account_type": "us",
  "bank_name": "Fictitious National Bank",
  "street_line_1": "1 Example St",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "USA"
}'
```

Use **Get Beneficiaries** (`GET /payout/fiat/beneficiaries`) to list saved beneficiaries, or **Get Beneficiary** (`GET /payout/fiat/beneficiaries/{id}`) for one.

### Send Payout

Sends the payout to the recipient's bank account. Pass the beneficiary's ID from Add Beneficiary along with their bank account details in `receipient_info`.

| Method | URL |
| ------ | ---------------- |
| POST | /payout/disburse |

**Request body payload:**

| Parameter | Required | Description | Example |
| ---------------------------------- | -------- | ------------------------------------------------------ | -------------------------------------- |
| currency | Yes | Currency code. | "USD" |
| amount | Yes | Amount to send. | 250.00 |
| narration | No | Description for the payout. | "Vendor payout" |
| customer_reference | Yes | Unique reference for the payout. | "USD-PAY-20261019-001" |
| receipient_info.currency | Yes | Currency the recipient receives: `USD`, `EUR` or `GBP`. | "USD" |
| receipient_info.beneficiary | Yes | ID of the beneficiary saved with Add Beneficiary. | "b5f2c6a1-8e3d-4f7a-9c21-0d5e6f7a8b90" |
| receipient_info.account_type | Yes | Bank account type: `us` for USD, `iban` for EUR, `gb` for GBP. | "us" |
| receipient_info.account_owner_name | Yes | Full name of the bank account owner. | "Jane Doe" |
| receipient_info.account_number | USD, GBP | Recipient's bank account number. | "000123456789" |
| receipient_info.routing_number | USD only | Recipient bank's routing number. | "021000021" |
| receipient_info.sort_code | GBP only | Recipient bank's 6-digit sort code. | "040004" |
| receipient_info.iban | EUR only | Recipient's IBAN. | "DE89370400440532013000" |
| receipient_info.bic | EUR only | Recipient bank's BIC (SWIFT code). | "DEUTDEFF" |
| receipient_info.bank_name | Yes | Name of the recipient's bank. | "JPMorgan Chase" |
| receipient_info.country | Yes | ISO 3166-1 alpha-2 country code of the bank account. | "US" |

**Example request (USD):**

```bash
curl --request POST \
  --url '{{base_url}}/payout/disburse' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "currency": "USD",
  "amount": 250.00,
  "narration": "Vendor payout",
  "customer_reference": "USD-PAY-20261019-001",
  "receipient_info": {
    "currency": "USD",
    "beneficiary": "b5f2c6a1-8e3d-4f7a-9c21-0d5e6f7a8b90",
    "account_type": "us",
    "account_owner_name": "Jane Doe",
    "account_number": "000123456789",
    "routing_number": "021000021",
    "bank_name": "JPMorgan Chase",
    "country": "US"
  }
}'
```

**Example request (GBP):**

```bash
curl --request POST \
  --url '{{base_url}}/payout/disburse' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "currency": "USD",
  "amount": 150.00,
  "narration": "Vendor payout",
  "customer_reference": "GBP-PAY-20261019-001",
  "receipient_info": {
    "currency": "GBP",
    "beneficiary": "b5f2c6a1-8e3d-4f7a-9c21-0d5e6f7a8b90",
    "account_type": "gb",
    "account_owner_name": "Jane Doe",
    "account_number": "12345678",
    "sort_code": "040004",
    "bank_name": "Barclays",
    "country": "GB"
  }
}'
```

**Example request (EUR):**

```bash
curl --request POST \
  --url '{{base_url}}/payout/disburse' \
  --header 'Authorization: Bearer <your_api_key>' \
  --header 'Content-Type: application/json' \
  --header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
  --data '{
  "currency": "USD",
  "amount": 175.00,
  "narration": "Vendor payout",
  "customer_reference": "EUR-PAY-20261019-001",
  "receipient_info": {
    "currency": "EUR",
    "beneficiary": "b5f2c6a1-8e3d-4f7a-9c21-0d5e6f7a8b90",
    "account_type": "iban",
    "account_owner_name": "Jane Doe",
    "iban": "DE89370400440532013000",
    "bic": "DEUTDEFF",
    "bank_name": "Deutsche Bank",
    "country": "DE"
  }
}'
```

Use [Verify Transaction](/v2/payouts/verify-transaction) to check the payout's status.

---

## Stable Coin Payout

URL: https://docs.crayfi.com/v2/payouts/stable-coin-payouts

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Send USDT and other supported stablecoins to any compatible on-chain wallet via a simple three-step workflow.

Stable coin payouts let you disburse funds in stablecoins (e.g., USDT on Tron or Solana) directly to your customers' or partners' on-chain wallets. The flow is intentionally sequential: you first discover which assets are supported, then register the destination wallet as a beneficiary, and finally initiate the actual on-chain payout.

This guide walks through each of the three endpoints involved, what they do, the headers and body each one expects, and example requests and responses you can copy into your integration.

## Get Supported Assets

`GET /virtual-accounts/crypto/supported-assets`

This is always the first call in the stable coin payout flow. It returns the full list of assets your account is authorized to send, along with the blockchain, network protocol, and the canonical `id` you must use when adding beneficiaries or initiating payouts.

This endpoint sits under `/virtual-accounts/...`, so it needs the `collection` umbrella. An API key with the `disbursement` scope cannot call it — use an API key with the `collection` scope for this one call. See [API Key](/v2/cray-docs/api-key-scopes).

You should never hardcode asset identifiers in your application. Networks evolve, new assets are added, and existing ones can be deprecated. By calling this endpoint dynamically you ensure that the `asset`/`currency` field you submit downstream always matches a value the platform currently supports.

Each asset object also exposes useful metadata such as `decimals` (used to format amounts correctly in your UI), `networkProtocol` (so you can surface the correct chain to your user, e.g. TRX vs SOL), and `testnet` (so you can clearly separate staging from production assets).

### Headers

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer <your_api_key>` |
| `X-Signature` | `t=<unix-ms>,n=<uuid>,kid=<key-id>,v1=<base64-signature>` — see [Request Signing](/v2/cray-docs/request-signing) |

### Example Request

```bash
curl --location '{{base_url}}/virtual-accounts/crypto/supported-assets' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

### Example Response

```json
{
  "status": true,
  "message": "Supported assets retrieved successfully",
  "data": {
    "data": [
      {
        "algorithm": "MPC_ECDSA_SECP256K1",
        "baseAsset": "TRX",
        "blockchain": "TRX",
        "blockchainSymbol": null,
        "coinType": 195,
        "decimals": 6,
        "deprecated": false,
        "ethContractAddress": null,
        "hasFee": true,
        "id": "TRX_USDT_S2UZ",
        "issuerAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        "name": "USD Tether (Tron)",
        "networkProtocol": "TRX",
        "symbol": "USDT",
        "testnet": false,
        "type": "TRON_TRC20"
      },
      {
        "algorithm": "MPC_EDDSA_ED25519",
        "baseAsset": "SOL",
        "blockchain": "SOL",
        "blockchainSymbol": null,
        "coinType": 501,
        "decimals": 6,
        "deprecated": false,
        "ethContractAddress": null,
        "hasFee": true,
        "id": "SOL_USDT_EWAY",
        "issuerAddress": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        "name": "USDT (Solana)",
        "networkProtocol": "SOL",
        "symbol": "USDT",
        "testnet": false,
        "type": "SOL_ASSET"
      }
    ]
  }
}
```

## Add Beneficiary

`POST /payout/crypto/beneficiaries`

Once you know which assets are supported, the next step is to register the recipient's on-chain wallet as a beneficiary. A beneficiary is a saved (`name`, `asset`, `wallet_address`) tuple that the platform uses to validate the destination, prevent address typos from causing irreversible losses, and link future payouts to a known recipient for reporting.

The `asset` field must be exactly one of the `id` values returned by **Get Supported Assets** — it determines which blockchain the `wallet_address` will be validated against. Submitting a Solana address with a Tron `asset` (or vice versa) will be rejected.

Crypto transactions are irreversible. Always confirm the `wallet_address` and `asset` match the recipient's intended network before adding a beneficiary.

### Headers

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer <your_api_key>` |
| `X-Signature` | `t=<unix-ms>,n=<uuid>,kid=<key-id>,v1=<base64-signature>` — see [Request Signing](/v2/cray-docs/request-signing) |
| `Content-Type` | `application/json` |

### Body

```json
{
  "name": "OMU",
  "asset": "TRX_USDT_S2UZ",
  "wallet_address": "t21qererlxcfu24davl2r5sqmgzzgsal6wusda40er"
}
```

### Example Request

```bash
curl --location '{{base_url}}/payout/crypto/beneficiaries' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "name": "OMU",
    "asset": "BTC_TEST",
    "wallet_address": "tb1qerzrlxcfu24davlur5sqmgzzgsal6wusda40er"
}'
```

### Response

```json
{
    "success": true,
    "data": {
        "name": "OMU",
        "address_reference": "f3f47d77-acf9-4e97-8d85-4b05fe6487cd",
        "asset": "TRX_USDT_S2UZ",
        "wallet_address": "tb2qerzrlxcfu24davlur5sqmgzzgsal6wusda40er",
        "status": "Pending"
    },
    "message": "Beneficiary added"
}
```

## Initiate Payout

`POST /payout/crypto/initiate-payout`

This is the call that actually moves funds on-chain. It debits your stablecoin balance and broadcasts a transfer to the wallet identified by `address_reference`.

Field reference:

- `amount` — the amount to send, denominated in the asset's units (e.g. `"2"` USDT).
- `currency` — the asset `id` from **Get Supported Assets** (e.g. `TRX_USDT_S2UZ`). It must match the asset of the beneficiary you're sending to.
- `address_reference` — the unique identifier of the saved beneficiary returned when you added them via **Add Beneficiary**.
- `customer_reference` — your own unique reference for this payout. Use it for idempotency and to reconcile the transaction in your system.
- `narration` — a short, human-readable description of the payout, useful for internal reporting.

The response returns a Cray `reference` you should persist; this is the canonical ID you'll use to track status updates, requery the transaction, or correlate webhook events.

Always generate a unique `customer_reference` per payout. Reusing references can cause duplicate detection to reject otherwise valid transactions.

### Headers

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer <your_api_key>` |
| `X-Signature` | `t=<unix-ms>,n=<uuid>,kid=<key-id>,v1=<base64-signature>` — see [Request Signing](/v2/cray-docs/request-signing) |
| `Content-Type` | `application/json` |

### Body

```json
{
  "amount": "2",
  "currency": "TRX_USDT_S2UZ",
  "address_reference": "f3f47d77-acf9-4e97-8d85-4b05fe6487cd",
  "customer_reference": "d751b9ad2cf79hhh9000",
  "narration": "testPayouhht"
}
```

### Example Request

```bash
curl --location '{{base_url}}/payout/crypto/initiate-payout' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'Content-Type: application/json' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>' \
--data '{
    "amount": "50",
    "currency": "TRX_USDT_S2UZ",
    "address_reference": "eaaa2950-ddfd-43a8-a4d5-bbde9b8aa8be",
    "customer_reference": "d751b9ad2cf799000",
    "narration": "testPayout"
}'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "reference": "BK7QVUN5LRX6YE11777892030",
    "amount": "50",
    "charge": 0,
    "status": "Pending",
    "recipient_name": "ZINOL",
    "recipient_bank_code": null,
    "recipient_account_number": "tb1qerzrlxcfu24davlur5sqmgzzgsal6wusda40er",
    "processor_reference": null,
    "merchant_reference": "d751b9ad2cf799000"
  },
  "message": "Crypto payout initiated"
}
```

### Query transaction

The **Query Transaction** endpoint lets you pull up all the detailed info about any crypto payout transaction using its unique ID.

| Method | URL |
|--------|-----|
| GET | /query/{reference} |

**Example request:**

```bash
curl --location '{{base_url}}/query/{reference}' \
--header 'Authorization: Bearer <your_api_key>' \
--header 'X-Signature: t=1761132000000,n=1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8,kid=<key_id>,v1=<signature>'
```

---

## Get Banks

URL: https://docs.crayfi.com/v2/payouts/get-banks

Method: `GET`

Endpoint: `GET {{base_url}}/payout/banks`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The GET Banks endpoint is your one-stop shop to easily grab a comprehensive list of all supported banks! This is super useful for making your app smooth for users. You can use it to instantly populate bank options during user onboarding or when they’re setting up payout and transfer operations, which helps ensure total accuracy and cuts down on frustrating input errors!



---

## Account Name Lookup

URL: https://docs.crayfi.com/v2/payouts/account-name-lookup

Method: `POST`

Endpoint: `POST {{base_url}}/payout/accounts/validate`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The Validate endpoint is your handy tool for making sure money goes to the right person! It allows you to validate a bank account number instantly using just the provided account number and bank code. It quickly returns the corresponding account name, which is super helpful for you to confirm the beneficiary’s details before processing any payouts or transfers. This quick verification step totally prevents errors and ensures your funds are always sent to the correct recipient!



---

## Process Transfer

URL: https://docs.crayfi.com/v2/payouts/process-transfer

Method: `POST`

Endpoint: `POST {{base_url}}/payout/disburse`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The POST Disburse endpoint is what you use to easily send money from your merchant wallet right into a beneficiary’s bank account! This request is super important for seamless and secure disbursements to your vendors, partners, or customers. It requires your API key for authorization and accepts a simple JSON payload containing the transfer amount, a unique customer reference, the destination bank code, account number, recipient name, and an optional narration.

**For XOF Orange Money payouts specifically**: when the destination provider (receipient_info.bank_code) is 'orange' AND the country (receipient_info.country) is 'senegal' or 'burkina faso', you must also include a top-level om_otp field with the sender's Orange Money OTP value.

**For NGN and GHS payouts**: you need the ref_id returned by Account Name Lookup, so run a fresh lookup right before each payout (pass country_code GH for Ghana; leave it out for Nigeria).

It ensures all your transfers are traceable and processed quickly!



---

## Verify Transaction

URL: https://docs.crayfi.com/v2/payouts/verify-transaction

Method: `GET`

Endpoint: `GET {{base_url}}/payout/requery/{transaction_id}`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The GET Requery endpoint is your instant way to check on any money you’ve sent out! It allows you to immediately retrieve the current status of a specific payout using its unique transaction_id as a path parameter. This is super useful for confirming whether a disbursement was successful, pending, or failed, which ensures transparency and makes troubleshooting or reconciliation processes a total breeze!



---

## Add Beneficiary

URL: https://docs.crayfi.com/v2/payouts/add-fiat-beneficiary

Method: `POST`

Endpoint: `POST {{base_url}}/payout/fiat/beneficiaries`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Saves a recipient's bank account for USD, EUR or GBP payouts.



---

## Get Beneficiaries

URL: https://docs.crayfi.com/v2/payouts/get-fiat-beneficiaries

Method: `GET`

Endpoint: `GET {{base_url}}/payout/fiat/beneficiaries`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Lists the USD, EUR and GBP beneficiaries you have saved.



---

## Get Beneficiary

URL: https://docs.crayfi.com/v2/payouts/get-fiat-beneficiary

Method: `GET`

Endpoint: `GET {{base_url}}/payout/fiat/beneficiaries/{id}`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns a single saved beneficiary.



---

## Send Payout

URL: https://docs.crayfi.com/v2/payouts/usd-eur-gbp-payout

Method: `POST`

Endpoint: `POST {{base_url}}/payout/disburse`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Sends a USD, EUR or GBP payout to the recipient's bank account.



---

## Get Banks

URL: https://docs.crayfi.com/v2/payouts/cross-currency-get-banks

Method: `GET`

Endpoint: `GET {{base_url}}/payout/banks`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Lists the banks and mobile money providers a payout can go to. Leave out countryCode for Nigerian banks; send GH for Ghanaian banks and mobile money providers.



---

## Verify Account

URL: https://docs.crayfi.com/v2/payouts/cross-currency-verify-account

Method: `POST`

Endpoint: `POST {{base_url}}/payout/verify-account`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Confirms the recipient's account name and returns a short-lived ref_id. Pass the ref_id unchanged in the beneficiary object when you disburse.



---

## Get Rate

URL: https://docs.crayfi.com/v2/payouts/cross-currency-get-rate

Method: `GET`

Endpoint: `GET {{base_url}}/payout/cross-currency/rate`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns a quote for converting the source amount into the target currency. The quote_id expires after expires_in_minutes and must be passed unchanged to Disburse.



---

## Disburse

URL: https://docs.crayfi.com/v2/payouts/cross-currency-disburse

Method: `POST`

Endpoint: `POST {{base_url}}/payout/cross-currency/disburse`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Sends the payout using a quote from Get Rate and a ref_id from Verify Account. The amount must exactly match the quoted source_amount.



---

## Check Status

URL: https://docs.crayfi.com/v2/payouts/cross-currency-status

Method: `GET`

Endpoint: `GET {{base_url}}/payout/cross-currency/status/{reference}`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns the payout's overall status and each processing step. Use the reference from the Disburse response, not your payout_reference.



---

## Get Supported Assets

URL: https://docs.crayfi.com/v2/payouts/get-supported-assets

Method: `GET`

Endpoint: `GET {{base_url}}/virtual-accounts/crypto/supported-assets`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Retrieve the full list of stablecoins your account can send. Always call this first to get the canonical assetId you'll use when adding beneficiaries and initiating payouts.



---

## Add Beneficiary

URL: https://docs.crayfi.com/v2/payouts/add-crypto-beneficiary

Method: `POST`

Endpoint: `POST {{base_url}}/payout/crypto/beneficiaries`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Register a recipient's on-chain wallet as a beneficiary. The asset must be a valid id from the Get Supported Assets endpoint and determines which blockchain the wallet_address is validated against.



---

## Initiate Payout

URL: https://docs.crayfi.com/v2/payouts/initiate-crypto-payout

Method: `POST`

Endpoint: `POST {{base_url}}/payout/crypto/initiate-payout`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Move funds on-chain to a saved beneficiary. The currency must match the beneficiary's asset, and customer_reference should be unique per payout to ensure idempotency.



---

# Conversions

## How Conversions Work

URL: https://docs.crayfi.com/v2/conversions

This guide provides a step-by-step overview of the currency conversion process, from checking exchange rates to disputing a transaction.

## Supported Currencies

- **USD**: United States
- **ZMW**: Zambia
- **GHS**: Ghana
- **XOF**: West African CFA
- **NGN**: Nigeria
- **KES**: Kenya
- **TZS**: Tanzania

## Authentication At A Glance

| Endpoints | API key | Scope | Request signing |
| --- | --- | --- | --- |
| `POST /rates`, `POST /rates/destination`, `GET /get-rates`, and `POST /quote` | API key | `conversion` | Required |
| `/conversions` and `/conversion-requests` endpoints | API key | `conversion` | Required |

The Cray Dashboard's own conversion screens use separate, browser-session routes that an API key cannot call. Integrate against the endpoints on this page.

## 1. Get Exchange Rates

Before initiating a conversion, you can check the current exchange rates.

### A. Get a Specific Exchange Rate

POST /rates

Retrieves the exchange rate, Service Level Agreement (SLA), and settlement type for a specific currency pair.

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "source_currency": "EUR",
      "destination_currency": "NGN",
      "rate": "5002.000000",
      "sla": 0,
      "settlement": "automatic",
      "status": "Active"
    },
    {
      "id": 19,
      "source_currency": "USD",
      "destination_currency": "NGN",
      "rate": "1450.000000",
      "sla": 3,
      "settlement": "automatic",
      "status": "active"
    }
  ]
}
```

### B. Get Rates by Destination Currency

POST /rates/destination

Retrieves all available exchange rates for a given destination currency.

### C. Get All Rates

GET /get-rates

Returns the available exchange rates. See [Get All Rates](/v2/conversions/get-all-rates).

## 2. Generate a Quote

POST /quote

Before converting, you must generate a quote. The quote locks in the conversion rate for a specific duration (default: 10 minutes).

**Request:**

```json
{
  "destination_currency": "USD",
  "source_currency": "NGN",
  "source_amount": 1500
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "quote_id": "quote:f9d96be7-5653-4e90-a5ad-4420db7b0195",
    "conversion_rate": 1600,
    "expires_in_minutes": 10
  },
  "message": "Quote generated"
}
```

## 3. Execute Conversion

POST /conversions

Finalizes the conversion using a valid `quote_id` obtained from the "Generate a Quote" endpoint. Requires the `conversion` scope and a signed request.

**Request:**

```json
{
  "quote_id": "quote:98a5d6d3-7cbc-4c7d-b4f6-d3bbbbe340b6"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "quote_id": "quote:98a5d6d3-7cbc-4c7d-b4f6-d3bbbbe340b6",
    "debit_transaction_id": 2605,
    "credit_transaction_id": 2606,
    "settlement": "automatic",
    "sla_minutes": 0
  },
  "message": "Conversion initialized"
}
```

## 4. List Conversions

GET /conversions

Retrieves a history of conversion transactions.

```json
{
  "success": true,
  "data": [
    {
      "quote_id": "quote:98a5d6d3-7cbc-4c7d-b4f6-d3bbbbe340b6",
      "debit_transaction_id": 2605,
      "credit_transaction_id": 2606,
      "status": "completed",
      "created_at": "2025-04-18T10:30:00.000000Z"
    }
  ],
  "message": "Conversions retrieved"
}
```

## 5. Get a Conversion by Reference

GET /conversions/reference/{reference}

Retrieves a single conversion by its reference. See [Get Conversion by Reference](/v2/conversions/get-conversion-by-reference).

## 6. Dispute Conversion

POST /conversions/{conversion_id}/dispute

Allows a merchant to raise a dispute on a specific conversion transaction (e.g., if credit is delayed beyond SLA).

**URL Parameters:**
- `conversion_id` (integer, required): The ID of the conversion to dispute.

**Request:**

```json
{
  "reason": "Credit not received after SLA."
}
```

## 7. Conversion Requests

GET /conversion-requests/pending

Returns conversion requests that are pending. See [List Pending Conversion Requests](/v2/conversions/list-pending-conversion-requests).

PATCH /conversion-requests/{id}/status

Updates the status of a conversion request. See [Update Conversion Request Status](/v2/conversions/update-conversion-request-status).

---

## Generate a Quote

URL: https://docs.crayfi.com/v2/conversions/generate-quote

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Before converting, you must generate a quote. The quote locks in the conversion rate for a specific duration (default: 10 minutes). Requires an API key with the `conversion` scope.

| Method | URL |
| ------ | ------ |
| POST | /quote |

### Request Body Payload

| Parameter | Description |
| --------------------- | ------------------------------------------------------------------ |
| source_currency | The currency you are converting from. Example: `NGN` |
| destination_currency | The currency you are converting to. Example: `USD` |
| source_amount | The amount in the source currency to be converted. Example: `1500` |

---

## Execute Conversion

URL: https://docs.crayfi.com/v2/conversions/execute-conversion

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Finalizes the conversion using a valid quote_id obtained from the “Generate a Quote” endpoint.

| Method | URL |
| ------ | ------------ |
| POST | /conversions |

### Request Body Payload

| Parameter | Description |
| --------- | ----------------------------------------------------------------------------------- |
| quote_id | The unique identifier for the quote, obtained from the "Generate a Quote" endpoint. |

---

## List Conversions

URL: https://docs.crayfi.com/v2/conversions/list-conversions

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Retrieves a history of conversion transactions.

| Method | URL |
| ------ | ------------ |
| GET | /conversions |

This endpoint supports pagination via query parameters `page` and `per_page`.

---

## Dispute Conversion

URL: https://docs.crayfi.com/v2/conversions/dispute-conversion

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Allows a merchant to raise a dispute on a specific conversion transaction (e.g., if credit is delayed beyond SLA).

| Method | URL |
| ------ | -------------------------------------- |
| POST | /conversions/{conversion_id}/dispute |

### Path Parameters

| Parameter | Description |
| --------------- | ---------------------------------------- |
| `conversion_id` | The ID of the conversion to be disputed. |

---

## Get Specific Exchange Rate

URL: https://docs.crayfi.com/v2/conversions/get-specific-exchange-rate

Method: `POST`

Endpoint: `POST {{base_url}}/rates`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Retrieves the current exchange rate, Service Level Agreement (SLA), and settlement type for a specific currency pair. Requires an API key with the `conversion` scope.



---

## Get Rates by Destination Currency

URL: https://docs.crayfi.com/v2/conversions/get-rates-by-destination

Method: `POST`

Endpoint: `POST {{base_url}}/rates/destination`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Retrieves all available exchange rates for a given destination currency. Requires an API key with the `conversion` scope.



---

## Get All Rates

URL: https://docs.crayfi.com/v2/conversions/get-all-rates

Method: `GET`

Endpoint: `GET {{base_url}}/get-rates`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns the available exchange rates.



---

## Generate a Quote

URL: https://docs.crayfi.com/v2/conversions/generate-quote-endpoint

Method: `POST`

Endpoint: `POST {{base_url}}/quote`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Before converting, you must generate a quote. The quote locks in the conversion rate for a specific duration (default: 10 minutes). Requires an API key with the `conversion` scope.



---

## Execute Conversion

URL: https://docs.crayfi.com/v2/conversions/execute-conversion-endpoint

Method: `POST`

Endpoint: `POST {{base_url}}/conversions`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Finalizes the conversion using a valid quote_id obtained from the “Generate a Quote” endpoint.



---

## Query Conversions

URL: https://docs.crayfi.com/v2/conversions/query-conversions

Method: `GET`

Endpoint: `GET {{base_url}}/conversions`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Retrieves a history of conversion transactions.



---

## Dispute Conversions

URL: https://docs.crayfi.com/v2/conversions/dispute-conversions-endpoint

Method: `POST`

Endpoint: `POST {{base_url}}/conversions/{conversion_id}/dispute`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Allows a merchant to raise a dispute on a specific conversion transaction (e.g., if credit is delayed beyond SLA).



---

## Get Conversion by Reference

URL: https://docs.crayfi.com/v2/conversions/get-conversion-by-reference

Method: `GET`

Endpoint: `GET {{base_url}}/conversions/reference/{reference}`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Retrieves a single conversion by its reference.



---

## List Pending Conversion Requests

URL: https://docs.crayfi.com/v2/conversions/list-pending-conversion-requests

Method: `GET`

Endpoint: `GET {{base_url}}/conversion-requests/pending`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns conversion requests that are pending.



---

## Update Conversion Request Status

URL: https://docs.crayfi.com/v2/conversions/update-conversion-request-status

Method: `PATCH`

Endpoint: `PATCH {{base_url}}/conversion-requests/{id}/status`

**Endpoint access**
**Scope:** `conversion` — use an API key with the `conversion` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Updates the status of a conversion request.



---

# Refunds

## Refund

URL: https://docs.crayfi.com/v2/refunds

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The general functionality that enables a merchant to return funds to a customer after a successful payment is called the Refund System or Refund Processing. This is a critical component of a payment platform like Cray, which provides capabilities for merchants to manage these reversals.

## Supported Currencies

* **NGN**: Nigeria
* **GHS**: Ghana
* **KES**: Kenya
* **ZMW**: Zambia
* **XOF**: West African CFA (Benin, Ivory Coast, Togo, Burkina Faso, Senegal)
* **USD**: United States
* **MZN**: Mozambique
* **XAF**: Central African CFA (Cameroon)
* **ZAR**: South Africa

## Initiate

The Initiate endpoint is your first step to easily getting money back to a customer! It's super simple: just send a POST request to /refund/initiate. It only requires the customer reference of the original successful transaction in the request body, and instantly returns a status response telling you whether the refund process has been successfully initiated. This endpoint is essential for processing customer refunds quickly and programmatically!

| Method | URL |
| ------ | --- |
| POST | /refund/initiate |

### Request Body Payload

| Parameter | Description |
| --------- | ----------- |
| reference | Required. The reference of the original successful transaction to be refunded. Example: "A74HULEKBXCRGQ2" |

## Partial Refund

The Initiate endpoint is how you easily send back just a portion of a customer's original payment! It's super helpful for programmatically managing customer refund workflows, especially when only part of the goods or services are being returned. Just send a POST request to /refund/initiate with the customer reference of the original transaction and the specific refund amount you want to return in the request body. The system processes the request and sends back a status to let you know the partial refund has been successfully initiated!

| Method | URL |
| ------ | --- |
| POST | /refund/initiate |

### Request Body Payload

| Parameter | Description |
| --------- | ----------- |
| reference | Required. The reference of the original successful transaction to be refunded. Example: "A74HULEKBXCRGQ2" |
| amount | Optional. The amount to be refunded. Omit it to refund the full transaction amount. Example: "1.2" |

## Check Refund Status

The GET Query endpoint is your quick and easy way to check on any refund you've initiated! It allows you to instantly retrieve all the details and the current status of a specific refund just by using its reference ID as a path variable ( /refund/query/{reference} ). This functionality is super useful for tracking the refund process in real-time, helping your business monitor everything seamlessly and provide accurate updates to your customers!

| Method | URL |
| ------ | --- |
| GET | /refund/query/{reference} |

---

## Initiate Refund

URL: https://docs.crayfi.com/v2/refunds/initiate-refund

Method: `POST`

Endpoint: `POST {{base_url}}/refund/initiate`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

This endpoint allows you to initiate a full or partial refund for a transaction.



---

## Check Refund Status

URL: https://docs.crayfi.com/v2/refunds/check-refund-status

Method: `GET`

Endpoint: `GET {{base_url}}/refund/query/{reference}`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

The GET Query endpoint is your quick and easy way to check on any refund you’ve initiated! It allows you to instantly retrieve all the details and the current status of a specific refund just by using its reference ID as a path variable ( /refund/query/{reference} ). This functionality is super useful for tracking the refund process in real-time, helping your business monitor everything seamlessly and provide accurate updates to your customers!



---

# Bill Payments

## Bill Payments

URL: https://docs.crayfi.com/v2/bill-payments

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Vend airtime, mobile data, cable TV, electricity and betting top-ups to your customers through a single asynchronous API.

Bill payments let you sell everyday utilities;  airtime, mobile data, cable TV subscriptions, electricity tokens and betting wallet top-ups, directly from your Cray balance. All five bill types share one set of endpoints; only the fields you send change per type.

---

### Integration

**Authentication**: Pass an API key with the `disbursement` scope in the `api-key` header on every request. `Authorization: Bearer <your_api_key>` also works.

All responses use a consistent envelope:

```json
{
  "success": true,
  "data": {},
  "message": "string"
}
```

---

### Bill Types

Each bill type supports a different combination of the available steps, and `customer_reference` means something different per type:

| Type | Products | Validate Customer | `product_code` | `meter_type` | `customer_reference` |
|---|---|---|---|---|---|
| Airtime | No | No | — | — | Phone number |
| Data | Yes | No | Required | — | Phone number |
| Cable TV | Yes | Yes | Required | — | Smartcard / IUC number |
| Electricity | No | Yes | — | Required | Meter number |
| Betting | No | No | — | — | Customer ID on the platform |

> **Warning** Betting has no customer validation step, double-check the customer ID before vending, there is no way to confirm it first. For electricity, `meter_type` must be exactly `prepaid` or `postpaid`.

---

### How It Works

1. **Get Providers** — `GET /bill-payments/providers?type={type}` returns the service providers available for a bill type (e.g. MTN, DSTV, JOS, BET9JA).
2. **Get Products** (Data & Cable only): `GET /bill-payments/products?type={type}&service_provider={provider}` lists bundles or bouquets. Capture the `product_code` you want to vend, for example `DSTV_COMPACT` for the DSTV Compact bouquet.
3. **Validate Customer** (Cable & Electricity only): `POST /bill-payments/validate-customer` confirms the smartcard or meter number and returns the customer's name before you charge them. For **Cable**, also pass the `product_code` from Get Products (e.g. `DSTV_COMPACT`).
4. **Initiate Bill Payment** : `POST /bill-payments` vends the bill. You supply a unique `reference` yourself. Returns `202` — the vend completes asynchronously.
5. **Get Bill Status** : `GET /bill-payments/{reference}/status` — poll until the status is `paid` or `failed`. For prepaid electricity, the token appears inside `fulfillment` on the status response.
6. **List Bills** : `GET /bill-payments` returns all bills for your merchant account, newest first. Filter with the optional `type` query parameter.
7. **Force Requery** : `POST /bill-payments/requery/reference` forces an immediate upstream status check instead of waiting for the background requery job.

---

### Initiate Request Fields

* `reference` (string, required): Your unique transaction reference.
* `type` (string, required): One of `airtime`, `data`, `cable`, `electricity`, `betting`.
* `service_provider` (string, required): A provider from the Get Providers endpoint.
* `customer_reference` (string, required): Phone number, smartcard/IUC number, meter number, or betting customer ID — depending on the type.
* `product_code` (string, required for Data & Cable): A product code from the Get Products endpoint.
* `meter_type` (string, required for Electricity): `prepaid` or `postpaid`.
* `phone_number` (string, required for Electricity): Contact phone number for the meter.
* `amount` (number, required): Amount to vend.
* `currency` (string, required): `NGN`.

> **Note** Bill payments are currently available in **NGN** only.

Try each endpoint live in the **Bill payment endpoint examples** section of the sidebar.

---

## Get Bill Providers

URL: https://docs.crayfi.com/v2/bill-payments/get-bill-providers

Method: `GET`

Endpoint: `GET {{base_url}}/bill-payments/providers?type=airtime`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns the service providers available for a bill type (airtime, data, cable, electricity or betting). Always call this first to pick a valid service_provider.



---

## Get Bill Products

URL: https://docs.crayfi.com/v2/bill-payments/get-bill-products

Method: `GET`

Endpoint: `GET {{base_url}}/bill-payments/products?type=data&service_provider=MTN`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Lists the bundles or bouquets available for a provider. Only Data and Cable have products — capture the product_code you want to vend before calling Initiate Bill Payment.



---

## Validate Bill Customer

URL: https://docs.crayfi.com/v2/bill-payments/validate-bill-customer

Method: `POST`

Endpoint: `POST {{base_url}}/bill-payments/validate-customer`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Confirms the smartcard/IUC or meter number and returns the customer's name before you charge them. Only Cable and Electricity support validation. For Cable, pass the product_code from Get Products.



---

## Initiate Bill Payment

URL: https://docs.crayfi.com/v2/bill-payments/initiate-bill-payment

Method: `POST`

Endpoint: `POST {{base_url}}/bill-payments`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Vends a bill. You supply a unique reference yourself. Returns 202 — the vend completes asynchronously, so poll Get Bill Status until paid or failed.



---

## Get Bill Status

URL: https://docs.crayfi.com/v2/bill-payments/get-bill-status

Method: `GET`

Endpoint: `GET {{base_url}}/bill-payments/{reference}/status`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Reads back a bill by the reference you supplied at initiation. Poll until paid or failed. For prepaid electricity, the token appears inside fulfillment here.



---

## List Bills

URL: https://docs.crayfi.com/v2/bill-payments/list-bills

Method: `GET`

Endpoint: `GET {{base_url}}/bill-payments`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns all bills for your merchant account, newest first. Use the optional type query parameter to filter to a single bill type.



---

## Force Requery

URL: https://docs.crayfi.com/v2/bill-payments/requery-bill

Method: `POST`

Endpoint: `POST {{base_url}}/bill-payments/requery/reference`

**Endpoint access**
**Scope:** `disbursement` — use an API key with the `disbursement` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Forces an immediate upstream status check for a bill instead of waiting for the background requery job.



---

# Sub-accounts

## Sub-accounts

URL: https://docs.crayfi.com/v2/sub-accounts

R2 sub-accounts let you partition your activity under sub-accounts that each have their own wallets and settlement.

**The merchant API currently gives read access only.** Creating and managing sub-accounts is done in the Cray Dashboard. There is no API endpoint to create, update or delete a sub-account.

## Endpoints

| Method | Path | Scope | Request signing |
| --- | --- | --- | --- |
| GET | `/subaccounts/{sub_account_public_id}/ledger` | None required | Required |
| GET | `/subaccounts/{sub_account_public_id}/transaction-history` | `collection` | Required |

Paths are relative to the [base URL](/v2/cray-docs/environments).

## Identifying A Sub-account

Both endpoints identify the sub-account by its **public UUID**. Your merchant account is resolved from the API key you send — the path carries only the sub-account's UUID, never a merchant identifier.

The UUID must be in the canonical 8-4-4-4-12 form (for example `3f6c2a1e-8b4d-4c2f-9a7e-1d5b6c7e8f90`). Anything else does not match the route at all and returns **404**.

## Pagination

Both endpoints accept a `page` query parameter (1-based, up to 6 digits, default 1) and return a `pagination` object:

| Field | Description |
| --- | --- |
| `current_page` | The page returned. |
| `per_page` | Items per page. |
| `total` | Total number of items. |
| `has_more` | Whether another page follows. |

### Errors

| HTTP | Meaning |
| --- | --- |
| 401 | The key did not resolve to a merchant. |
| 403 | An API key lacks the `collection` umbrella (transaction history only). |
| 404 | Sub-account not found, or not owned by this merchant. |
| 422 | Invalid `currency` or `page`. |
| 503 | Temporarily unavailable — retry. |

A 404 is returned both when the sub-account does not exist and when it belongs to another merchant. This is deliberate: the API does not reveal whether another merchant's sub-account exists.

---

## Get Sub-account Ledger

URL: https://docs.crayfi.com/v2/sub-accounts/ledger

Method: `GET`

Endpoint: `GET {{base_url}}/subaccounts/{sub_account_public_id}/ledger`

**Endpoint access**
**Scope:** none required — an API key with the `collection`, `disbursement` or `conversion` scope can call this endpoint. A `webhook` key cannot. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns a sub-account's per-currency wallet balances and its ledger entries for one currency.

### Response Data

| Field | Description |
| --- | --- |
| `currency` | The selected currency. |
| `currencies` | The currencies available on this sub-account. |
| `wallets` | Per-currency balances, each with `currency`, `available_balance` and `ledger_balance`. |
| `entries` | Ledger entries for the selected currency. |
| `pagination` | `current_page`, `per_page`, `total`, `has_more`. |

### Errors

| HTTP | Meaning |
| --- | --- |
| 401 | The key did not resolve to a merchant. |
| 404 | Sub-account not found, or not owned by this merchant. |
| 422 | Invalid `currency` or `page`. |
| 503 | Temporarily unavailable — retry. |

A 404 is returned both when the sub-account does not exist and when it belongs to another merchant. This is deliberate: the API does not reveal whether another merchant's sub-account exists.

---

## Get Sub-account Transaction History

URL: https://docs.crayfi.com/v2/sub-accounts/transaction-history

Method: `GET`

Endpoint: `GET {{base_url}}/subaccounts/{sub_account_public_id}/transaction-history`

**Endpoint access**
**Scope:** `collection` — use an API key with the `collection` scope. A key with any other scope is denied with `403 SCOPE_DENIED`. See [API Key](/cray-docs/api-key-scopes).
**Request signing:** required — send an `X-Signature` header with every request. See [Request Signing](/cray-docs/request-signing).

Returns a sub-account's collection transaction history, paginated.

### Response

A paginated list of the sub-account's collection transactions, with the same `pagination` object as the ledger: `current_page`, `per_page`, `total`, `has_more`.

### Errors

| HTTP | Meaning |
| --- | --- |
| 401 | The key did not resolve to a merchant. |
| 403 | An API key lacks the `collection` umbrella. |
| 404 | Sub-account not found, or not owned by this merchant. |
| 422 | Invalid `currency` or `page`. |
| 503 | Temporarily unavailable — retry. |

A 404 is returned both when the sub-account does not exist and when it belongs to another merchant. This is deliberate: the API does not reveal whether another merchant's sub-account exists.

---
