import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { crayConfig, CrayModuleOptions, CrayModuleAsyncOptions } from './config/cray.config';
import { CRAY_MODULE_OPTIONS, CRAY_SERVICE } from './config/cray.constants';
import { CrayApiClient } from './clients/cray-api.client';
import { CrayService } from './cray.service';
import { CrayCustomer } from './entities/cray-customer.entity';
import { CrayVirtualAccount } from './entities/cray-virtual-account.entity';
import { CrayBeneficiary } from './entities/cray-beneficiary.entity';
import { CrayTransfer } from './entities/cray-transfer.entity';
import { CrayCheckout } from './entities/cray-checkout.entity';
import { CrayWebhookEvent } from './entities/cray-webhook-event.entity';
import { CrayIdempotencyRecord } from './entities/cray-idempotency.entity';
import { CrayTransactionRecord } from './entities/cray-transaction.entity';
import { CrayBalanceSnapshot } from './entities/cray-balance-snapshot.entity';
import { CrayReconciliationRecord } from './entities/cray-reconciliation-record.entity';
import { AccountsController } from './accounts/accounts.controller';
import { AccountsService } from './accounts/accounts.service';
import { BanksController } from './banks/banks.controller';
import { BanksService } from './banks/banks.service';
import { TransfersController } from './transfers/transfers.controller';
import { TransfersService } from './transfers/transfers.service';
import { CheckoutController } from './checkout/checkout.controller';
import { CheckoutService } from './checkout/checkout.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';
import { WebhooksVerifier } from './webhooks/webhooks.verifier';
import { IdempotencyService } from './idempotency/idempotency.service';
import { ReconciliationController } from './reconciliation/reconciliation.controller';
import { ReconciliationService } from './reconciliation/reconciliation.service';

const ENTITIES = [
  CrayCustomer,
  CrayVirtualAccount,
  CrayBeneficiary,
  CrayTransfer,
  CrayCheckout,
  CrayWebhookEvent,
  CrayIdempotencyRecord,
  CrayTransactionRecord,
  CrayBalanceSnapshot,
  CrayReconciliationRecord,
];

@Module({
  imports: [
    ConfigModule.forFeature(crayConfig),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [
    AccountsController,
    BanksController,
    TransfersController,
    CheckoutController,
    WebhooksController,
    ReconciliationController,
  ],
  providers: [
    {
      provide: CRAY_MODULE_OPTIONS,
      useFactory: (config: ConfigType<typeof crayConfig>) => config,
      inject: [crayConfig.KEY],
    },
    CrayApiClient,
    AccountsService,
    BanksService,
    TransfersService,
    CheckoutService,
    WebhooksVerifier,
    WebhooksService,
    IdempotencyService,
    ReconciliationService,
    CrayService,
    {
      provide: CRAY_SERVICE,
      useExisting: CrayService,
    },
  ],
  exports: [
    CRAY_MODULE_OPTIONS,
    CRAY_SERVICE,
    CrayService,
    CrayApiClient,
    AccountsService,
    BanksService,
    TransfersService,
    CheckoutService,
    WebhooksVerifier,
    WebhooksService,
    IdempotencyService,
    ReconciliationService,
    TypeOrmModule,
  ],
})
export class CrayModule {
  static forRoot(options?: Partial<CrayModuleOptions>): DynamicModule {
    const customOptionsProvider: Provider = {
      provide: CRAY_MODULE_OPTIONS,
      useFactory: (defaultConfig: ConfigType<typeof crayConfig>) => ({
        ...defaultConfig,
        ...options,
      }),
      inject: [crayConfig.KEY],
    };

    return {
      module: CrayModule,
      imports: [
        ConfigModule.forFeature(crayConfig),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forFeature(ENTITIES),
      ],
      controllers: [
        AccountsController,
        BanksController,
        TransfersController,
        CheckoutController,
        WebhooksController,
        ReconciliationController,
      ],
      providers: [
        customOptionsProvider,
        CrayApiClient,
        AccountsService,
        BanksService,
        TransfersService,
        CheckoutService,
        WebhooksVerifier,
        WebhooksService,
        IdempotencyService,
        ReconciliationService,
        CrayService,
        {
          provide: CRAY_SERVICE,
          useExisting: CrayService,
        },
      ],
      exports: [
        CRAY_MODULE_OPTIONS,
        CRAY_SERVICE,
        CrayService,
        CrayApiClient,
        AccountsService,
        BanksService,
        TransfersService,
        CheckoutService,
        WebhooksVerifier,
        WebhooksService,
        IdempotencyService,
        ReconciliationService,
        TypeOrmModule,
      ],
    };
  }

  static forRootAsync(options: CrayModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: CRAY_MODULE_OPTIONS,
      useFactory: async (defaultConfig: ConfigType<typeof crayConfig>, ...injected: any[]) => {
        let customOptions: Partial<CrayModuleOptions> = {};
        if (options.useFactory) {
          customOptions = await options.useFactory(...injected);
        }
        return {
          ...defaultConfig,
          ...customOptions,
        };
      },
      inject: [crayConfig.KEY, ...(options.inject || [])],
    };

    return {
      module: CrayModule,
      imports: [
        ...(options.imports || []),
        ConfigModule.forFeature(crayConfig),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forFeature(ENTITIES),
      ],
      controllers: [
        AccountsController,
        BanksController,
        TransfersController,
        CheckoutController,
        WebhooksController,
        ReconciliationController,
      ],
      providers: [
        asyncOptionsProvider,
        CrayApiClient,
        AccountsService,
        BanksService,
        TransfersService,
        CheckoutService,
        WebhooksVerifier,
        WebhooksService,
        IdempotencyService,
        ReconciliationService,
        CrayService,
        {
          provide: CRAY_SERVICE,
          useExisting: CrayService,
        },
      ],
      exports: [
        CRAY_MODULE_OPTIONS,
        CRAY_SERVICE,
        CrayService,
        CrayApiClient,
        AccountsService,
        BanksService,
        TransfersService,
        CheckoutService,
        WebhooksVerifier,
        WebhooksService,
        IdempotencyService,
        ReconciliationService,
        TypeOrmModule,
      ],
    };
  }
}
