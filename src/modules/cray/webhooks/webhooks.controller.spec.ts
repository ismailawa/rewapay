import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { CrayWebhookPayloadDto } from './dto/webhook-payload.dto';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let service: jest.Mocked<WebhooksService>;

  beforeEach(async () => {
    const mockService = {
      processWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: WebhooksService, useValue: mockService }],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    service = module.get(WebhooksService);
  });

  it('should call webhooksService.processWebhook and return received acknowledgment', async () => {
    service.processWebhook.mockResolvedValueOnce({
      received: true,
      eventId: 'evt_test_123',
      status: 'PROCESSED',
    });

    const payload: CrayWebhookPayloadDto = {
      event: 'collection.mobile_money.successful',
      data: { customer_reference: 'ref_001', amount: '1000' },
      hash: 'base64_hash_here',
    };

    const mockRequest = {
      headers: {
        'x-forwarded-for': '192.168.1.10',
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const result = await controller.handleWebhook(payload, mockRequest);

    expect(result).toEqual({ received: true, eventId: 'evt_test_123' });
    expect(service.processWebhook).toHaveBeenCalledWith(payload, {
      clientIp: '192.168.1.10',
    });
  });
});
