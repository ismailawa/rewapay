import {
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Module,
  UseGuards,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Request } from 'express';
import { CrayModule } from '../src/modules/cray/cray.module';
import { CrayApiClient } from '../src/modules/cray/clients/cray-api.client';
import { BanksService } from '../src/modules/cray/banks/banks.service';
import { CrayBanksControllerBase } from '../src/modules/cray/banks/banks.controller';
import { WebhooksService } from '../src/modules/cray/webhooks/webhooks.service';
import { CrayWebhooksControllerBase } from '../src/modules/cray/webhooks/webhooks.controller';
import type {
  CrayAuthorizationContext,
  CrayWebhookIngressContext,
} from '../src/modules/cray/controllers';
import { TEST_CRAY_OPTIONS } from '../src/modules/cray/testing/test-options';
import * as entities from '../src/modules/cray/entities';

@Injectable()
class HostAuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    return request.headers['x-host-auth'] === 'allow';
  }
}

@Injectable()
class HostAuthorizationPolicy {
  readonly operationalContexts: CrayAuthorizationContext[] = [];
  readonly webhookContexts: CrayWebhookIngressContext[] = [];

  authorize(context: CrayAuthorizationContext): void {
    this.operationalContexts.push(context);
    if (context.request.headers['x-resource-auth'] !== 'allow') {
      throw new ForbiddenException('Resource access denied');
    }
  }

  authorizeWebhook(context: CrayWebhookIngressContext): void {
    this.webhookContexts.push(context);
    if (context.request.headers['x-webhook-ingress'] !== 'allow') {
      throw new ForbiddenException('Webhook ingress denied');
    }
  }
}

@Controller('secure/cray/banks')
@UseGuards(HostAuthenticationGuard)
class HostBanksController extends CrayBanksControllerBase {
  constructor(
    banksService: BanksService,
    private readonly policy: HostAuthorizationPolicy,
  ) {
    super(banksService);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    this.policy.authorize(context);
  }
}

@Controller('integrations/cray/webhooks')
class HostWebhooksController extends CrayWebhooksControllerBase {
  constructor(
    webhooksService: WebhooksService,
    private readonly policy: HostAuthorizationPolicy,
  ) {
    super(webhooksService);
  }

  protected authorizeWebhookIngress(context: CrayWebhookIngressContext): void {
    this.policy.authorizeWebhook(context);
  }
}

@Module({
  imports: [CrayModule.forRoot(TEST_CRAY_OPTIONS)],
  controllers: [HostBanksController, HostWebhooksController],
  providers: [HostAuthenticationGuard, HostAuthorizationPolicy],
})
class HostCrayHttpModule {}

describe('Cray opt-in controller security e2e', () => {
  const repositories = Object.values(entities).filter(
    (value) => typeof value === 'function',
  );
  const repositoryMock = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(async (value: unknown) => value),
    create: jest.fn((value: unknown) => value),
    insert: jest.fn(),
  };
  const banksService = {
    listBanks: jest.fn().mockResolvedValue([
      { code: '000014', name: 'ACCESS BANK' },
    ]),
    validateBankAccount: jest.fn(),
  };
  const webhooksService = {
    processWebhook: jest.fn().mockResolvedValue({
      received: true,
      eventId: 'event-1',
      status: 'PROCESSED',
    }),
  };
  let app: INestApplication;
  let policy: HostAuthorizationPolicy;

  beforeAll(async () => {
    const builder = Test.createTestingModule({ imports: [HostCrayHttpModule] })
      .overrideProvider(CrayApiClient)
      .useValue({ get: jest.fn(), post: jest.fn() })
      .overrideProvider(BanksService)
      .useValue(banksService)
      .overrideProvider(WebhooksService)
      .useValue(webhooksService);

    for (const entity of repositories) {
      builder.overrideProvider(getRepositoryToken(entity)).useValue(repositoryMock);
    }

    const moduleFixture: TestingModule = await builder.compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    policy = app.get(HostAuthorizationPolicy);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    policy.operationalContexts.length = 0;
    policy.webhookContexts.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['get', '/cray/accounts/virtual/customer-1'],
    ['get', '/cray/banks'],
    ['get', '/cray/checkout/reference-1'],
    ['get', '/cray/transfers/reference-1'],
    ['get', '/cray/refunds/reference-1'],
    ['get', '/cray/balance'],
    ['post', '/cray/webhooks'],
  ] as const)('does not mount the former %s %s route', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(404);
  });

  it('blocks the inherited host route when its guard rejects', async () => {
    await request(app.getHttpServer())
      .get('/secure/cray/banks')
      .expect(403);

    expect(banksService.listBanks).not.toHaveBeenCalled();
    expect(policy.operationalContexts).toHaveLength(0);
  });

  it('blocks service execution when the required authorization hook rejects', async () => {
    await request(app.getHttpServer())
      .get('/secure/cray/banks')
      .set('x-host-auth', 'allow')
      .expect(403);

    expect(banksService.listBanks).not.toHaveBeenCalled();
    expect(policy.operationalContexts[0]).toEqual(
      expect.objectContaining({ operation: 'banks.list', resource: {} }),
    );
  });

  it('inherits method routes under the host prefix when both policies allow', async () => {
    await request(app.getHttpServer())
      .get('/secure/cray/banks')
      .set('x-host-auth', 'allow')
      .set('x-resource-auth', 'allow')
      .expect(200)
      .expect([{ code: '000014', name: 'ACCESS BANK' }]);

    expect(banksService.listBanks).toHaveBeenCalledWith(false);
  });

  it('mounts webhooks only at the explicit host route and applies ingress policy first', async () => {
    const payload = {
      event: 'collection.transfer.successful',
      data: { customer_reference: 'reference-1' },
      hash: 'signature',
    };

    await request(app.getHttpServer())
      .post('/integrations/cray/webhooks')
      .send(payload)
      .expect(403);
    expect(webhooksService.processWebhook).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post('/integrations/cray/webhooks')
      .set('x-webhook-ingress', 'allow')
      .send(payload)
      .expect(200)
      .expect({ received: true, eventId: 'event-1' });

    expect(policy.webhookContexts[0]).toEqual(
      expect.objectContaining({ event: payload.event }),
    );
    expect(webhooksService.processWebhook).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ clientIp: expect.any(String) }),
    );
  });
});
