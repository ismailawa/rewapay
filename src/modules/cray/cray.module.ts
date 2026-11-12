import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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
import { CrayRefund } from './entities/cray-refund.entity';
import { AccountsService } from './accounts/accounts.service';
import { BanksService } from './banks/banks.service';
import { TransfersService } from './transfers/transfers.service';
import { CheckoutService } from './checkout/checkout.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';
import { WebhooksVerifier } from './webhooks/webhooks.verifier';
import { IdempotencyService } from './idempotency/idempotency.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { RefundsService } from './refunds/refunds.service';
import { ReconciliationJobs } from './reconciliation/reconciliation.jobs';

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
  CrayRefund,
];

@Module({
  imports: [
    ConfigModule.forFeature(crayConfig),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [
    WebhooksController,
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
    RefundsService,
    ReconciliationJobs,
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
    RefundsService,
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
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature(ENTITIES),
      ],
      controllers: [
        WebhooksController,
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
        RefundsService,
        ReconciliationJobs,
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
        RefundsService,
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
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature(ENTITIES),
      ],
      controllers: [
        WebhooksController,
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
        RefundsService,
        ReconciliationJobs,
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
        RefundsService,
        TypeOrmModule,
      ],
    };
  }
}
