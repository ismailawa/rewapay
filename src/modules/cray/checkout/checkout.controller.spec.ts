import type { Request } from 'express';
import { CrayCheckoutControllerBase } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CrayStatus } from '../enums/cray.enums';
import type { CrayAuthorizationContext } from '../controllers';

class TestCheckoutController extends CrayCheckoutControllerBase {
  readonly authorizeMock = jest.fn<void, [CrayAuthorizationContext]>();

  constructor(service: CheckoutService) {
    super(service);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    this.authorizeMock(context);
  }
}

describe('CrayCheckoutControllerBase', () => {
  const request = {} as Request;
  let controller: TestCheckoutController;
  let service: jest.Mocked<CheckoutService>;

  beforeEach(() => {
    service = {
      createCheckoutSession: jest.fn(),
      getCheckoutStatus: jest.fn(),
      queryTransaction: jest.fn(),
      chargeCard: jest.fn(),
    } as unknown as jest.Mocked<CheckoutService>;
    controller = new TestCheckoutController(service);
  });

  it('authorizes checkout creation without exposing amount or customer PII', async () => {
    service.createCheckoutSession.mockResolvedValueOnce({
      sessionId: 'PAYCODE123',
      paymentUrl: 'https://checkout.connectramp.com/pay/PAYCODE123',
    });
    const dto = {
      amount: '500.00',
      currency: 'NGN',
      reference: 'ctrl_ref_001',
      defaultPaymentMethod: 'transfer' as const,
      feeBearer: 'merchant' as const,
      customer: { name: 'John Doe', email: 'john@example.com' },
      customerId: 'customer-1',
      walletId: 'wallet-1',
    };

    await controller.createCheckoutSession(dto, request);

    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'checkout.create',
      request,
      resource: {
        customerId: 'customer-1',
        walletId: 'wallet-1',
        reference: 'ctrl_ref_001',
      },
    });
    const serializedContext = JSON.stringify(controller.authorizeMock.mock.calls[0][0]);
    expect(serializedContext).not.toContain('500.00');
    expect(serializedContext).not.toContain('john@example.com');
  });

  it('authorizes checkout status, query, and direct charge identifiers', async () => {
    service.getCheckoutStatus.mockResolvedValueOnce({
      status: CrayStatus.SUCCESSFUL, amount: '500.00',
    });
    service.queryTransaction.mockResolvedValueOnce({ status: 'Successful' });
    service.chargeCard.mockResolvedValueOnce({ status: 'redirect_auth' });

    await controller.getCheckoutStatus('checkout-ref', request);
    await controller.queryTransaction('query-ref', request);
    await controller.chargeCard('TXN_123', request);

    expect(controller.authorizeMock).toHaveBeenNthCalledWith(1, {
      operation: 'checkout.read', request, resource: { reference: 'checkout-ref' },
    });
    expect(controller.authorizeMock).toHaveBeenNthCalledWith(2, {
      operation: 'checkout.query', request, resource: { reference: 'query-ref' },
    });
    expect(controller.authorizeMock).toHaveBeenNthCalledWith(3, {
      operation: 'checkout.charge', request, resource: { transactionId: 'TXN_123' },
    });
  });
});
