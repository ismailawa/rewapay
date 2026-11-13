import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CrayStatus } from '../enums/cray.enums';

describe('CheckoutController', () => {
  let controller: CheckoutController;
  let service: jest.Mocked<CheckoutService>;

  beforeEach(async () => {
    const mockService = {
      createCheckoutSession: jest.fn(),
      getCheckoutStatus: jest.fn(),
      queryTransaction: jest.fn(),
      chargeCard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: CheckoutService, useValue: mockService }],
    }).compile();

    controller = module.get<CheckoutController>(CheckoutController);
    service = module.get(CheckoutService);
  });

  it('should call checkoutService.createCheckoutSession on POST /cray/checkout', async () => {
    service.createCheckoutSession.mockResolvedValueOnce({
      sessionId: 'PAYCODE123',
      paymentUrl: 'https://checkout.connectramp.com/pay/PAYCODE123',
      expiresAt: '',
    });

    const result = await controller.createCheckoutSession({
      amount: '500.00',
      currency: 'NGN',
      reference: 'ctrl_ref_001',
      defaultPaymentMethod: 'transfer',
      feeBearer: 'merchant',
      customer: { name: 'John Doe', email: 'john@example.com' },
    });

    expect(result.paymentUrl).toBe('https://checkout.connectramp.com/pay/PAYCODE123');
    expect(result.sessionId).toBe('PAYCODE123');
    expect(service.createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('should call checkoutService.getCheckoutStatus on GET /cray/checkout/:reference', async () => {
    service.getCheckoutStatus.mockResolvedValueOnce({
      status: CrayStatus.SUCCESSFUL,
      amount: '500.00',
      confirmedAt: '2026-11-10T18:00:00.000Z',
    });

    const result = await controller.getCheckoutStatus('ctrl_ref_001');

    expect(result.status).toBe(CrayStatus.SUCCESSFUL);
    expect(result.amount).toBe('500.00');
    expect(service.getCheckoutStatus).toHaveBeenCalledWith('ctrl_ref_001');
  });

  it('should call checkoutService.queryTransaction on GET /cray/checkout/query/:reference', async () => {
    service.queryTransaction.mockResolvedValueOnce({
      status: 'Successful',
      reference: 'ctrl_ref_002',
    });

    const result = await controller.queryTransaction('ctrl_ref_002');
    expect(result).toEqual({ status: 'Successful', reference: 'ctrl_ref_002' });
    expect(service.queryTransaction).toHaveBeenCalledWith('ctrl_ref_002');
  });

  it('should call checkoutService.chargeCard on POST /cray/checkout/charge', async () => {
    service.chargeCard.mockResolvedValueOnce({
      status: 'redirect_auth',
      reference: 'ctrl_ref_003',
    });

    const result = await controller.chargeCard('TXN_123');
    expect(result).toEqual({ status: 'redirect_auth', reference: 'ctrl_ref_003' });
    expect(service.chargeCard).toHaveBeenCalledWith('TXN_123');
  });
});
