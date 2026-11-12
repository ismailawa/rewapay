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
        environment: config.get<'staging' | 'production' | 'test'>(
          'CRAY_ENVIRONMENT',
          'staging',
        ),
        collectionApiKey: config.get<string>('CRAY_COLLECTION_API_KEY', ''),
        disbursementApiKey: config.get<string>('CRAY_DISBURSEMENT_API_KEY', ''),
        requestSigningEnabled:
          config.get<string>('CRAY_REQUEST_SIGNING_ENABLED', 'false').toLowerCase() === 'true',
        signingKeyId: config.get<string>('CRAY_SIGNING_KEY_ID', ''),
        signingPrivateKey: config.get<string>('CRAY_SIGNING_PRIVATE_KEY', ''),
        webhookKeys: config
          .get<string>('CRAY_WEBHOOK_KEYS', '')
          .split(',')
          .filter(Boolean),
        dataEncryptionKey: config.get<string>('CRAY_DATA_ENCRYPTION_KEY', ''),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
