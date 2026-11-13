# Integrating Cray into an Existing NestJS System

This guide describes the supported source-vendoring model. The host owns authentication, authorization, tenant boundaries, URL prefixes, API versioning, database lifecycle, and deployment.

## Security boundary

`CrayModule`, `CrayModule.forRoot`, and `CrayModule.forRootAsync` register providers and entities only. They mount zero HTTP controllers.

The recommended integration calls `ICrayService` in process. Optional HTTP adapters are abstract, unmounted bases. They become reachable only after a host subclasses one, adds `@Controller` and guards, implements the required authorization hook, and registers the subclass.

Webhook ingestion follows the same opt-in rule. The host ingress hook is an additional perimeter check; it does not replace collection HMAC verification or authoritative payin/payout requery.

## Source installation

Copy these source units while preserving their relative structure:

- `src/modules/cray`
- `src/migrations/1794489600000-CrayV2SecurityRemediation.ts`

Do not rename the migration timestamp, class, or `name` property after it has been applied anywhere.

Install the runtime dependencies listed in the root README. The host TypeScript configuration must enable decorators and decorator metadata. PostgreSQL must support UUID generation, and the host TypeORM data source must discover the copied entities and migration.

Register TypeORM before the Cray dynamic module. Recommended production settings are `autoLoadEntities: true`, `synchronize: false`, explicit migration execution, and TLS appropriate to the host database.

If several host feature modules need Cray providers, configure Cray once in a wrapper module and re-export it:

```ts
@Module({
  imports: [
    CrayModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        environment: config.get('CRAY_ENVIRONMENT', 'staging'),
        baseUrl: config.getOrThrow('CRAY_BASE_URL'),
        apiKey: config.getOrThrow('CRAY_API_KEY'),
        requestSigningEnabled:
          config.get('CRAY_REQUEST_SIGNING_ENABLED', 'false') === 'true',
        signingKeyId: config.get('CRAY_SIGNING_KEY_ID', ''),
        signingPrivateKey: config.get('CRAY_SIGNING_PRIVATE_KEY', ''),
        dataEncryptionKey: config.getOrThrow('CRAY_DATA_ENCRYPTION_KEY'),
      }),
    }),
  ],
  exports: [CrayModule],
})
export class CrayInfrastructureModule {}
```

Feature modules import `CrayInfrastructureModule`; they must not construct another differently configured Cray module.

## Service API

Inject `CRAY_SERVICE` and type it as `ICrayService`. It exposes:

| Area | Operations |
|---|---|
| Accounts | `createVirtualAccount`, `getVirtualAccount` |
| Funding | `createFundingSession`, `getFundingStatus` |
| Banks | `listBanks`, `validateBankAccount` |
| Transfers | `initiateTransfer`, `getTransferStatus` |
| Refunds | `initiateRefund`, `getRefundStatus` |
| Platform | `getPlatformBalance` |

Use decimal strings such as `"100.00"`; never convert financial values through JavaScript floating-point arithmetic. Reuse the same merchant reference only for an idempotent retry of the same logical request.

Feature services remain exported for advanced host-only operations:

- `CheckoutService` for general collection query and gated direct-card charge.
- `ReconciliationService` for snapshots and manual reconciliation.
- `WebhooksService` for verified provider event processing.

Prefer the facade whenever it supports the required operation.

## Optional protected HTTP adapters

The host may extend these bases:

| Base | Relative inherited routes | Intended policy |
|---|---|---|
| `CrayAccountsControllerBase` | `POST /`, `GET /:customerId` | Customer/tenant ownership |
| `CrayBanksControllerBase` | `GET /`, `POST /verify` | Authenticated payments user |
| `CrayCheckoutControllerBase` | `POST /`, `GET /query/:reference`, `POST /charge`, `GET /:reference` | Wallet/reference ownership |
| `CrayTransfersControllerBase` | `POST /`, `GET /:reference` | Wallet ownership and payout role |
| `CrayRefundsControllerBase` | `POST /`, `GET /:reference` | Original-payment ownership/refund role |
| `CrayAdminControllerBase` | `GET /balance`, `POST /balance/snapshot`, `POST /reconciliation/run` | Operations/admin only |
| `CrayWebhooksControllerBase` | `POST /` | Provider ingress only |

The host's class-level `@Controller('chosen/prefix')` supplies the prefix. Nest inherits the method route metadata from the base.

Every operational/admin handler calls `authorize()` before its service. The context contains only an operation name, Express request, and safe resource identifiers. The hook must throw `UnauthorizedException` or `ForbiddenException` on rejection.

```ts
@Controller('api/v1/wallet/cray/accounts')
@UseGuards(JwtAuthGuard)
export class WalletCrayAccountsController extends CrayAccountsControllerBase {
  constructor(
    accounts: AccountsService,
    private readonly access: WalletAccessPolicy,
  ) {
    super(accounts);
  }

  protected authorize(context: CrayAuthorizationContext): Promise<void> {
    return this.access.assertCustomerOwnership({
      principal: context.request.user,
      customerId: context.resource.customerId,
      operation: context.operation,
    });
  }
}
```

Register `WalletCrayAccountsController` in a host module that imports `CrayInfrastructureModule`.

For public/customer endpoints, compare every supplied customer/wallet/reference with server-owned records linked to the authenticated principal. When an identifier must never come from the client, override the handler or write a small host controller around `ICrayService` and derive the identifier from the session.

Apply a separate admin guard and policy to `CrayAdminControllerBase`. Do not expose reconciliation triggers under ordinary wallet-user authorization.

## Webhook registration

Cray cannot present a host customer JWT. Use a dedicated integration URL and ingress controls such as rate limiting, trusted proxy configuration, optional provider IP policy, and request size limits.

```ts
@Controller('integrations/cray/webhooks')
@UseGuards(CrayWebhookRateLimitGuard)
export class CrayWebhookEndpoint extends CrayWebhooksControllerBase {
  constructor(
    webhooks: WebhooksService,
    private readonly ingress: CrayIngressPolicy,
  ) {
    super(webhooks);
  }

  protected authorizeWebhookIngress(
    context: CrayWebhookIngressContext,
  ): Promise<void> {
    return this.ingress.assertAllowed({
      clientIp: context.clientIp,
      event: context.event,
    });
  }
}
```

Only `event`, request, and resolved client IP enter the ingress hook. The raw financial payload is deliberately excluded. After ingress authorization, `WebhooksService` verifies the provider event, deduplicates delivery, redacts persisted data, and emits terminal domain events only after verification.

Configure trusted proxies carefully before relying on `X-Forwarded-For`; an untrusted client can spoof that header.

## Validation and error handling

Enable a global `ValidationPipe` with transformation, whitelisting, and rejection of unknown properties. The provider-facing services also validate financial and provider invariants.

Map `CrayException` to the host's standard error envelope without exposing provider payloads or sensitive details. Retry only when `retryable` permits it. Never blindly retry an ambiguous payout or refund; use the stored state and reconciliation path.

## Domain events

Subscribe through `EventEmitter2` to verified events:

- `funding.confirmed`
- `funding.failed`
- `transfer.completed`
- `transfer.failed`
- `refund.completed`

Handlers must remain idempotent because external delivery and internal processing can be repeated.

## Deployment checklist

- Required environment variables are supplied through a secret manager.
- The data-encryption key is stable across deployments and not the Cray API key.
- Migrations have run before application traffic starts.
- No default Cray HTTP route is expected after importing the module.
- Every registered operational subclass has both a guard and ownership/role authorization hook.
- The webhook endpoint has an explicit ingress policy and leaves provider verification enabled.
- Sensitive values are excluded from logs and authorization context.
- Unit, build, database E2E, and host controller security tests pass.
