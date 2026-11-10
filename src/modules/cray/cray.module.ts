import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { crayConfig, CrayModuleOptions } from './config/cray.config';
import { CRAY_MODULE_OPTIONS } from './config/cray.constants';
import { CrayApiClient } from './clients/cray-api.client';
import { CrayCustomer } from './entities/cray-customer.entity';
import { CrayVirtualAccount } from './entities/cray-virtual-account.entity';
import { AccountsController } from './accounts/accounts.controller';
import { AccountsService } from './accounts/accounts.service';

const ENTITIES = [CrayCustomer, CrayVirtualAccount];

@Module({
  imports: [
    ConfigModule.forFeature(crayConfig),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [AccountsController],
  providers: [
    {
      provide: CRAY_MODULE_OPTIONS,
      useFactory: (config: ConfigType<typeof crayConfig>) => config,
      inject: [crayConfig.KEY],
    },
    CrayApiClient,
    AccountsService,
  ],
  exports: [CRAY_MODULE_OPTIONS, CrayApiClient, AccountsService, TypeOrmModule],
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
      controllers: [AccountsController],
      providers: [customOptionsProvider, CrayApiClient, AccountsService],
      exports: [CRAY_MODULE_OPTIONS, CrayApiClient, AccountsService, TypeOrmModule],
    };
  }
}
