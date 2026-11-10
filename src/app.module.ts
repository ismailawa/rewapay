import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrayModule } from './modules/cray/cray.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CrayModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        environment: config.get<'staging' | 'production'>('CRAY_ENVIRONMENT', 'staging'),
        apiToken: config.get<string>('CRAY_API_TOKEN'),
        requestSigningEnabled:
          config.get<string>('CRAY_REQUEST_SIGNING_ENABLED') === 'true',
        signingKeyId: config.get<string>('CRAY_SIGNING_KEY_ID'),
        signingPrivateKey: config.get<string>('CRAY_SIGNING_PRIVATE_KEY'),
        webhookSecret: config.get<string>('CRAY_WEBHOOK_SECRET'),
        webhookAllowedIps: config
          .get<string>('CRAY_WEBHOOK_ALLOWED_IPS', '')
          .split(',')
          .filter(Boolean),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
