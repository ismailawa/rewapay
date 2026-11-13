import type { Request } from 'express';
import type { CrayAuthorizationContext } from '../controllers';
import { CrayStatus } from '../enums/cray.enums';
import { CrayRefundsControllerBase } from './refunds.controller';
import { RefundsService } from './refunds.service';

class TestRefundsController extends CrayRefundsControllerBase {
  readonly authorizeMock = jest.fn<void, [CrayAuthorizationContext]>();

  constructor(service: RefundsService) {
    super(service);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    this.authorizeMock(context);
  }
}

describe('CrayRefundsControllerBase', () => {
  const request = {} as Request;
  let controller: TestRefundsController;
  let service: jest.Mocked<RefundsService>;

  beforeEach(() => {
    service = {
      initiate: jest.fn(),
      getStatus: jest.fn(),
    } as unknown as jest.Mocked<RefundsService>;
    controller = new TestRefundsController(service);
  });

  it('authorizes refund initiation without exposing the amount', async () => {
    service.initiate.mockResolvedValueOnce({
      refundId: 'refund-1', status: CrayStatus.PENDING,
    });

    await controller.initiateRefund(
      { reference: 'payment-1', amount: '100.00' },
      request,
    );

    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'refunds.create',
      request,
      resource: { reference: 'payment-1' },
    });
    expect(JSON.stringify(controller.authorizeMock.mock.calls[0][0])).not.toContain('100.00');
  });

  it('authorizes refund status by reference', async () => {
    service.getStatus.mockResolvedValueOnce({
      refundId: 'refund-1', status: CrayStatus.SUCCESSFUL,
    });
    await controller.getRefundStatus('payment-1', request);
    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'refunds.read', request, resource: { reference: 'payment-1' },
    });
  });
});
