import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { crayConfig, CrayModuleOptions } from './config/cray.config';
import { CRAY_MODULE_OPTIONS } from './config/cray.constants';

@Module({
  imports: [
    ConfigModule.forFeature(crayConfig),
    EventEmitterModule.forRoot(),
  ],
  providers: [
    {
      provide: CRAY_MODULE_OPTIONS,
      useFactory: (config: ConfigType<typeof crayConfig>) => config,
      inject: [crayConfig.KEY],
    },
  ],
  exports: [CRAY_MODULE_OPTIONS],
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
      ],
      providers: [customOptionsProvider],
      exports: [CRAY_MODULE_OPTIONS],
    };
  }
}
