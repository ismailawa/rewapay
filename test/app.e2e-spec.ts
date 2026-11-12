import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DataType, newDb } from 'pg-mem';
import { randomUUID } from 'crypto';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { CrayModule } from '../src/modules/cray/cray.module';
import { TEST_CRAY_OPTIONS } from '../src/modules/cray/testing/test-options';
import { CrayRefund } from '../src/modules/cray/entities/cray-refund.entity';
import { IdempotencyService } from '../src/modules/cray/idempotency/idempotency.service';
import { CrayException } from '../src/modules/cray/interfaces/cray.interfaces';
import * as entities from '../src/modules/cray/entities';

describe('Cray module database-backed e2e', () => {
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    db.public.registerFunction({ name: 'current_database', implementation: () => 'cray_test' });
    db.public.registerFunction({ name: 'version', implementation: () => 'PostgreSQL 16' });
    db.public.registerFunction({ name: 'uuid_generate_v4', implementation: randomUUID, impure: true });
    db.public.registerFunction({ name: 'quote_ident', args: [DataType.text], returns: DataType.text, implementation: (value: string) => value });
    db.public.registerFunction({ name: 'obj_description', args: [DataType.regclass, DataType.text], returns: DataType.text, implementation: () => null as unknown as string });
    db.public.registerFunction({ name: 'col_description', args: [DataType.regclass, DataType.integer], returns: DataType.text, implementation: () => null as unknown as string });
    const entityList = Object.values(entities).filter((value) => typeof value === 'function');

    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          retryAttempts: 1,
          useFactory: () => ({ type: 'postgres', entities: entityList, synchronize: true, retryAttempts: 1 }),
          dataSourceFactory: async (options) => {
            const source = await db.adapters.createTypeormDataSource(options!);
            return source.initialize();
          },
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
    const repo = moduleFixture.get<Repository<CrayRefund>>(getRepositoryToken(CrayRefund));
    await repo.save(repo.create({ reference: 'payment_1', providerReference: 'refund_1', status: 'PENDING' }));
    expect((await repo.findOneByOrFail({ reference: 'payment_1' })).providerReference).toBe('refund_1');
    expect(moduleFixture.get(DataSource).isInitialized).toBe(true);
  });

  it('atomically permits only one financial execution for a concurrent key', async () => {
    const idempotency = moduleFixture.get(IdempotencyService);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
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
    await expect(idempotency.execute(options)).rejects.toBeInstanceOf(CrayException);
    release();
    await expect(first).resolves.toEqual({ status: 'PENDING' });
    expect(executions).toBe(1);
  });
});
