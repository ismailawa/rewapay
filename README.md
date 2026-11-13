# RewaPay Cray v1 NestJS Module

Source-integrated NestJS support for Cray v1 virtual accounts, hosted checkout, NGN payouts, refunds, verified webhooks, balances, persistence, and reconciliation.

`CrayModule` is service-only: importing it creates no HTTP routes. An existing application can call the `ICrayService` facade directly or explicitly extend the unmounted controller bases and apply its own routes, guards, and authorization policy.

The provider wire contract is recorded in [`docs/cray-api-v1-docs.md`](docs/cray-api-v1-docs.md). See [`docs/host-integration.md`](docs/host-integration.md) for the complete host integration and controller route reference.

## Add it to an existing NestJS system

This repository is currently distributed as source, not as a published npm package.

1. Copy `src/modules/cray` into the host source tree.
2. Copy `src/migrations/1794489600000-CrayV2SecurityRemediation.ts` without renaming its class or timestamp.
3. Install the runtime dependencies not already present in the host:

```bash
npm install @nestjs/config @nestjs/event-emitter @nestjs/schedule @nestjs/typeorm axios class-transformer class-validator decimal.js pg typeorm uuid
```

The host must enable `experimentalDecorators`, `emitDecoratorMetadata`, and strict TypeScript compilation. Configure TypeORM before importing `CrayModule`, include the copied migration in the host migration configuration, and keep `synchronize: false` outside disposable tests.

## Configuration

```dotenv
CRAY_ENVIRONMENT=staging
CRAY_BASE_URL=https://pay.connectramp.com
CRAY_API_KEY=replace_with_staging_merchant_api_key
CRAY_REQUEST_SIGNING_ENABLED=false
# Required only when signing is enabled:
CRAY_SIGNING_KEY_ID=
CRAY_SIGNING_PRIVATE_KEY=
CRAY_DATA_ENCRYPTION_KEY=64_hex_char_secret_from_your_key_manager
DATABASE_URL=postgresql://user:password@host:5432/database
```

The current provider setup uses staging credentials with the production gateway URL. `CRAY_API_KEY`, `CRAY_DATA_ENCRYPTION_KEY`, and `DATABASE_URL` are required. Signing key ID/private key are required only when request signing is enabled.

Register TypeORM and Cray in the host module:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    CrayModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        environment: config.get('CRAY_ENVIRONMENT', 'staging'),
        baseUrl: config.get('CRAY_BASE_URL', 'https://pay.connectramp.com'),
        apiKey: config.getOrThrow('CRAY_API_KEY'),
        requestSigningEnabled:
          config.get('CRAY_REQUEST_SIGNING_ENABLED', 'false') === 'true',
        signingKeyId: config.get('CRAY_SIGNING_KEY_ID', ''),
        signingPrivateKey: config.get('CRAY_SIGNING_PRIVATE_KEY', ''),
        dataEncryptionKey: config.getOrThrow('CRAY_DATA_ENCRYPTION_KEY'),
      }),
    }),
  ],
})
export class PaymentsModule {}
```

Run the copied migration using the host application's normal TypeORM migration command before serving traffic.

## Recommended: call the service facade

Inject the stable `CRAY_SERVICE` token and type it as `ICrayService`:

```ts
@Injectable()
export class WalletPaymentsService {
  constructor(
    @Inject(CRAY_SERVICE) private readonly cray: ICrayService,
  ) {}

  createAccount(customerId: string, email: string, accountName: string) {
    return this.cray.createVirtualAccount({
      customerId,
      email,
      accountName,
      provider: 'Bloc',
      accountType: 'Permanent',
    });
  }

  fundWallet(customerId: string, walletId: string, reference: string) {
    return this.cray.createFundingSession({
      customerId,
      walletId,
      reference,
      amount: '1000.00',
      method: 'transfer',
      customer: { name: 'Jane Doe', email: 'jane@example.com' },
      callbackUrl: 'https://merchant.example/payments/return',
    });
  }
}
```

The facade also exposes bank listing/validation, transfer initiation/status, refund initiation/status, funding status, and platform balance. All monetary amounts are two-decimal major-unit strings.

Use `EventEmitter2` listeners for verified asynchronous outcomes such as `funding.confirmed`, `funding.failed`, `transfer.completed`, `transfer.failed`, and `refund.completed`.

## Optional: expose protected host APIs

Controller bases are exported but have no class-level `@Controller` decorator and are never registered by `CrayModule`. A host must deliberately provide the route, guard, authorization hook, constructor, and module registration:

```ts
@Controller('api/payments/cray/transfers')
@UseGuards(JwtAuthGuard)
export class ProtectedCrayTransfersController extends CrayTransfersControllerBase {
  constructor(
    transfersService: TransfersService,
    private readonly access: PaymentsAccessPolicy,
  ) {
    super(transfersService);
  }

  protected authorize(context: CrayAuthorizationContext): Promise<void> {
    return this.access.assertAllowed(context);
  }
}

@Module({
  controllers: [ProtectedCrayTransfersController],
  providers: [PaymentsAccessPolicy],
})
export class ProtectedPaymentsHttpModule {}
```

Register the subclass in the same host module that imports the configured dynamic `CrayModule`, or import a host wrapper module that re-exports that configured module. Do not import an unconfigured second copy merely to access its providers.

The authorization policy must compare `context.resource.customerId` and `walletId` with the authenticated principal and enforce tenant/role ownership. Authentication alone is insufficient. Never trust caller-supplied customer or wallet IDs without this comparison; override a handler or write a host controller around `ICrayService` when identity must be derived rather than accepted.

Authorization contexts deliberately exclude amounts, account numbers, BVN/NIN, card data, and raw bodies.

## Explicit webhook endpoint

The webhook base is also unmounted. Register it separately under an integration route. Do not require a customer JWT, because Cray is the caller; use an ingress/IP/throttling policy and retain the built-in HMAC or authoritative requery verification:

```ts
@Controller('integrations/cray/webhooks')
@UseGuards(CrayWebhookRateLimitGuard)
export class HostCrayWebhooksController extends CrayWebhooksControllerBase {
  constructor(
    webhooksService: WebhooksService,
    private readonly ingress: CrayWebhookIngressPolicy,
  ) {
    super(webhooksService);
  }

  protected authorizeWebhookIngress(
    context: CrayWebhookIngressContext,
  ): Promise<void> {
    return this.ingress.assertAllowed(context.clientIp);
  }
}
```

Register this subclass in the host module's `controllers` array. `WebhooksService` still verifies signed `collection.*` events with the merchant key and confirms unsigned `payin`/`payout` notifications through Cray before emitting terminal domain events.

Enable global request validation in the host:

```ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}));
```

## Verification

```bash
npm test -- --runInBand
npm run build
npm run test:e2e -- --runInBand
```

The normal live suite is read-only and uses staging configuration against Cray's instructed production gateway:

```bash
npm run test:e2e:live
```

Permanent virtual-account creation remains a separate, explicit mutation:

```bash
npm run test:e2e:live:virtual-account
```
