import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DataType, newDb } from 'pg-mem';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { CrayModule } from '../src/modules/cray/cray.module';
import { CRAY_MODULE_OPTIONS } from '../src/modules/cray/config/cray.constants';
import { CrayModuleOptions } from '../src/modules/cray/config/cray.config';
import { TEST_CRAY_OPTIONS } from '../src/modules/cray/testing/test-options';
import { CrayRefund } from '../src/modules/cray/entities/cray-refund.entity';
import { IdempotencyService } from '../src/modules/cray/idempotency/idempotency.service';
import { CrayException } from '../src/modules/cray/interfaces/cray.interfaces';
import * as entities from '../src/modules/cray/entities';

const entityList = Object.values(entities).filter(
  (value) => typeof value === 'function',
);

async function createTestDataSource(): Promise<DataSource> {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'current_database',
    implementation: () => 'cray_test',
  });
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 16',
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    implementation: randomUUID,
    impure: true,
  });
  db.public.registerFunction({
    name: 'quote_ident',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value: string) => value,
  });
  db.public.registerFunction({
    name: 'obj_description',
    args: [DataType.regclass, DataType.text],
    returns: DataType.text,
    implementation: () => null as unknown as string,
  });
  db.public.registerFunction({
    name: 'col_description',
    args: [DataType.regclass, DataType.integer],
    returns: DataType.text,
    implementation: () => null as unknown as string,
  });
  const source = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: entityList,
    synchronize: true,
    retryAttempts: 1,
  });
  return source.initialize();
}

describe('Cray module database-backed e2e', () => {
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    const source = await createTestDataSource();

    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          retryAttempts: 1,
          useFactory: () => source.options,
          dataSourceFactory: async () => source,
        }),
        CrayModule.forRoot(TEST_CRAY_OPTIONS),
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    await moduleFixture.init();
  });

  afterAll(async () => {
    if (moduleFixture) await moduleFixture.close();
  });

  it('starts with real TypeORM repositories and serves the host app', async () => {
    expect(moduleFixture.get(AppController).getHello()).toBe('Hello World!');
    const repo = moduleFixture.get<Repository<CrayRefund>>(
      getRepositoryToken(CrayRefund),
    );
    await repo.save(
      repo.create({
        reference: 'payment_1',
        providerReference: 'refund_1',
        status: 'PENDING',
      }),
    );
    expect(
      (await repo.findOneByOrFail({ reference: 'payment_1' }))
        .providerReference,
    ).toBe('refund_1');
    expect(moduleFixture.get(DataSource).isInitialized).toBe(true);
  });

  it('atomically permits only one financial execution for a concurrent key', async () => {
    const idempotency = moduleFixture.get(IdempotencyService);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let executions = 0;
    const options = {
      key: 'e2e-concurrent-transfer',
      operation: 'transfer',
      payload: { reference: 'transfer_1', amount: '100.00' },
      fn: async () => {
        executions += 1;
        await gate;
        return { status: 'PENDING' };
      },
    };

    const first = idempotency.execute(options);
    await new Promise((resolve) => setImmediate(resolve));
    await expect(idempotency.execute(options)).rejects.toBeInstanceOf(
      CrayException,
    );
    release();
    await expect(first).resolves.toEqual({ status: 'PENDING' });
    expect(executions).toBe(1);
  });
});

describe('Host AppModule database wiring e2e', () => {
  let moduleFixture: TestingModule;
  const environmentKeys = [
    'DATABASE_URL',
    'DATABASE_SSL',
    'CRAY_ENVIRONMENT',
    'CRAY_BASE_URL',
    'CRAY_API_KEY',
    'CRAY_REQUEST_SIGNING_ENABLED',
    'CRAY_SIGNING_KEY_ID',
    'CRAY_SIGNING_PRIVATE_KEY',
    'CRAY_DATA_ENCRYPTION_KEY',
  ] as const;
  const originalEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://unused-by-overridden-test-source';
    process.env.DATABASE_SSL = 'false';
    process.env.CRAY_ENVIRONMENT = 'staging';
    delete process.env.CRAY_BASE_URL;
    process.env.CRAY_API_KEY = 'lrs_e2e_test_key';
    process.env.CRAY_REQUEST_SIGNING_ENABLED = 'false';
    delete process.env.CRAY_SIGNING_KEY_ID;
    delete process.env.CRAY_SIGNING_PRIVATE_KEY;
    process.env.CRAY_DATA_ENCRYPTION_KEY =
      'test-data-encryption-key-at-least-32-bytes';

    const source = await createTestDataSource();
    moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(source)
      .compile();
    await moduleFixture.init();
  });

  afterAll(async () => {
    if (moduleFixture) await moduleFixture.close();
    for (const key of environmentKeys) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('constructs the host app, DataSource, and Cray repositories together', async () => {
    expect(moduleFixture.get(DataSource).isInitialized).toBe(true);
    expect(moduleFixture.get(AppController).getHello()).toBe('Hello World!');

    expect(moduleFixture.get<CrayModuleOptions>(CRAY_MODULE_OPTIONS)).toEqual(
      expect.objectContaining({
        environment: 'staging',
        apiKey: 'lrs_e2e_test_key',
        dataEncryptionKey: 'test-data-encryption-key-at-least-32-bytes',
        requestSigningEnabled: false,
      }),
    );

    const repo = moduleFixture.get<Repository<CrayRefund>>(
      getRepositoryToken(CrayRefund),
    );
    await repo.save(
      repo.create({
        reference: 'host_app_payment_1',
        providerReference: 'host_app_refund_1',
        status: 'PENDING',
      }),
    );
    await expect(
      repo.findOneByOrFail({ reference: 'host_app_payment_1' }),
    ).resolves.toEqual(
      expect.objectContaining({ providerReference: 'host_app_refund_1' }),
    );
  });
});
