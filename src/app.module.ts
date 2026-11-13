import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrayModule } from './modules/cray/cray.module';

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
        ssl:
          config.get<string>('DATABASE_SSL', 'false').toLowerCase() === 'true'
            ? { rejectUnauthorized: true }
            : false,
      }),
    }),
    CrayModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        environment: config.get<'staging' | 'production' | 'test'>(
          'CRAY_ENVIRONMENT',
          'staging',
        ),
        apiKey: config.get<string>('CRAY_API_KEY', ''),
        requestSigningEnabled:
          config
            .get<string>('CRAY_REQUEST_SIGNING_ENABLED', 'false')
            .toLowerCase() === 'true',
        signingKeyId: config.get<string>('CRAY_SIGNING_KEY_ID', ''),
        signingPrivateKey: config.get<string>('CRAY_SIGNING_PRIVATE_KEY', ''),
        dataEncryptionKey: config.get<string>('CRAY_DATA_ENCRYPTION_KEY', ''),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
