import type { Request } from 'express';
import { CrayWebhooksControllerBase } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { CrayWebhookPayloadDto } from './dto/webhook-payload.dto';
import type { CrayWebhookIngressContext } from '../controllers';

class TestWebhooksController extends CrayWebhooksControllerBase {
  readonly authorizeIngressMock = jest.fn<void, [CrayWebhookIngressContext]>();

  constructor(service: WebhooksService) {
    super(service);
  }

  protected authorizeWebhookIngress(context: CrayWebhookIngressContext): void {
    this.authorizeIngressMock(context);
  }
}

describe('CrayWebhooksControllerBase', () => {
  let controller: TestWebhooksController;
  let service: jest.Mocked<WebhooksService>;

  beforeEach(() => {
    service = {
      processWebhook: jest.fn(),
    } as unknown as jest.Mocked<WebhooksService>;
    controller = new TestWebhooksController(service);
  });

  it('applies host ingress policy before provider verification and processing', async () => {
    service.processWebhook.mockResolvedValueOnce({
      received: true, eventId: 'evt_test_123', status: 'PROCESSED',
    });
    const payload: CrayWebhookPayloadDto = {
      event: 'collection.mobile_money.successful',
      data: { customer_reference: 'ref_001', amount: '1000' },
      hash: 'base64_hash_here',
    };
    const request = {
      headers: { 'x-forwarded-for': '192.168.1.10' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const result = await controller.handleWebhook(payload, request);

    expect(controller.authorizeIngressMock).toHaveBeenCalledWith({
      request,
      event: payload.event,
      clientIp: '127.0.0.1',
    });
    expect(controller.authorizeIngressMock.mock.invocationCallOrder[0]).toBeLessThan(
      service.processWebhook.mock.invocationCallOrder[0],
    );
    expect(service.processWebhook).toHaveBeenCalledWith(payload, {
      clientIp: '127.0.0.1',
    });
    expect(result).toEqual({ received: true, eventId: 'evt_test_123' });
  });
});
