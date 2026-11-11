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
        environment: config.get<'staging' | 'production' | 'test'>('CRAY_ENVIRONMENT', 'staging'),
        // Scoped merchant API key (Bearer token) — provided as CRAYFI_MERCHANT_KEY_TEST in staging
        apiToken: config.get<string>('CRAYFI_MERCHANT_KEY_TEST') ?? config.get<string>('CRAY_API_TOKEN'),
        // Payment Initialization inline credentials (no Bearer / no X-Signature)
        publicKey: config.get<string>('CRAYFI_PUBLIC_KEY_TEST'),
        secretKey: config.get<string>('CRAYFI_SECRET_KEY_TEST'),
        // Request signing — required by default on all Cray endpoints (Docs §Request Signing)
        // Set CRAY_REQUEST_SIGNING_ENABLED=true + CRAY_SIGNING_PRIVATE_KEY to enable.
        // Set to false only if Dashboard signing mode is "Off".
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
