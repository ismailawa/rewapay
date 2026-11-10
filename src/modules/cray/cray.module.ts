import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { crayConfig, CrayModuleOptions } from './config/cray.config';
import { CRAY_MODULE_OPTIONS } from './config/cray.constants';
import { CrayApiClient } from './clients/cray-api.client';
import { CrayCustomer } from './entities/cray-customer.entity';
import { CrayVirtualAccount } from './entities/cray-virtual-account.entity';
import { CrayBeneficiary } from './entities/cray-beneficiary.entity';
import { CrayTransfer } from './entities/cray-transfer.entity';
import { CrayCheckout } from './entities/cray-checkout.entity';
import { CrayWebhookEvent } from './entities/cray-webhook-event.entity';
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

const ENTITIES = [
  CrayCustomer,
  CrayVirtualAccount,
  CrayBeneficiary,
  CrayTransfer,
  CrayCheckout,
  CrayWebhookEvent,
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
  ],
  exports: [
    CRAY_MODULE_OPTIONS,
    CrayApiClient,
    AccountsService,
    BanksService,
    TransfersService,
    CheckoutService,
    WebhooksVerifier,
    WebhooksService,
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
      ],
      exports: [
        CRAY_MODULE_OPTIONS,
        CrayApiClient,
        AccountsService,
        BanksService,
        TransfersService,
        CheckoutService,
        WebhooksVerifier,
        WebhooksService,
        TypeOrmModule,
      ],
    };
  }
}
