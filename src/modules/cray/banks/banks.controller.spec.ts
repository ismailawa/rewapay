import type { Request } from 'express';
import { CrayBanksControllerBase } from './banks.controller';
import { BanksService } from './banks.service';
import type { CrayAuthorizationContext } from '../controllers';

class TestBanksController extends CrayBanksControllerBase {
  readonly authorizeMock = jest.fn<void, [CrayAuthorizationContext]>();

  constructor(service: BanksService) {
    super(service);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    this.authorizeMock(context);
  }
}

describe('CrayBanksControllerBase', () => {
  const request = {} as Request;
  let controller: TestBanksController;
  let service: jest.Mocked<BanksService>;

  beforeEach(() => {
    service = {
      listBanks: jest.fn(),
      validateBankAccount: jest.fn(),
    } as unknown as jest.Mocked<BanksService>;
    controller = new TestBanksController(service);
  });

  it('authorizes and lists banks with optional refresh', async () => {
    service.listBanks.mockResolvedValueOnce([{ code: '000014', name: 'ACCESS BANK' }]);
    await controller.getBanks('true', request);
    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'banks.list', request, resource: {},
    });
    expect(service.listBanks).toHaveBeenCalledWith(true);
  });

  it('excludes the account number from validation authorization context', async () => {
    service.validateBankAccount.mockResolvedValueOnce({
      accountName: 'JANE DOE', refId: 'sess_123',
    });
    const dto = {
      accountNumber: '0123456789',
      bankCode: '000013',
      customerId: 'customer-1',
    };

    await controller.verifyAccount(dto, request);

    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'banks.validate',
      request,
      resource: { customerId: 'customer-1', bankCode: '000013' },
    });
    expect(JSON.stringify(controller.authorizeMock.mock.calls[0][0])).not.toContain('0123456789');
    expect(service.validateBankAccount).toHaveBeenCalledWith(dto);
  });
});
