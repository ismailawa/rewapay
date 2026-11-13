import type { Request } from 'express';
import { CrayTransfersControllerBase } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { CrayStatus } from '../enums/cray.enums';
import type { CrayAuthorizationContext } from '../controllers';

class TestTransfersController extends CrayTransfersControllerBase {
  readonly authorizeMock = jest.fn<void, [CrayAuthorizationContext]>();

  constructor(service: TransfersService) {
    super(service);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    this.authorizeMock(context);
  }
}

describe('CrayTransfersControllerBase', () => {
  const request = {} as Request;
  let controller: TestTransfersController;
  let service: jest.Mocked<TransfersService>;

  beforeEach(() => {
    service = {
      initiateTransfer: jest.fn(),
      getTransferStatus: jest.fn(),
    } as unknown as jest.Mocked<TransfersService>;
    controller = new TestTransfersController(service);
  });

  it('authorizes transfer creation without exposing destination or amount', async () => {
    service.initiateTransfer.mockResolvedValueOnce({
      transferId: 'TRF_123', status: CrayStatus.PENDING,
    });
    const dto = {
      customerId: 'customer-1',
      walletId: 'wallet-1',
      amount: '500.00',
      reference: 'ref_1',
      destination: {
        accountNumber: '0123456789',
        bankCode: '000013',
        accountName: 'TEST USER',
      },
    };

    await controller.initiateTransfer(dto, request);

    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'transfers.create',
      request,
      resource: {
        customerId: 'customer-1', walletId: 'wallet-1', reference: 'ref_1',
      },
    });
    const serializedContext = JSON.stringify(controller.authorizeMock.mock.calls[0][0]);
    expect(serializedContext).not.toContain('0123456789');
    expect(serializedContext).not.toContain('500.00');
  });

  it('authorizes transfer status by reference', async () => {
    service.getTransferStatus.mockResolvedValueOnce({
      status: CrayStatus.SUCCESSFUL, amount: '500.00',
    });
    await controller.getTransferStatus('ref_1', request);
    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'transfers.read', request, resource: { reference: 'ref_1' },
    });
  });
});
