import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { CrayAccountsControllerBase } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { CrayStatus } from '../enums/cray.enums';
import type { CrayAuthorizationContext } from '../controllers';

class TestAccountsController extends CrayAccountsControllerBase {
  readonly authorizeMock = jest.fn<void, [CrayAuthorizationContext]>();

  constructor(service: AccountsService) {
    super(service);
  }

  protected authorize(context: CrayAuthorizationContext): void {
    this.authorizeMock(context);
  }
}

describe('CrayAccountsControllerBase', () => {
  const request = {} as Request;
  let controller: TestAccountsController;
  let service: jest.Mocked<AccountsService>;

  beforeEach(() => {
    service = {
      createVirtualAccount: jest.fn(),
      getVirtualAccount: jest.fn(),
    } as unknown as jest.Mocked<AccountsService>;
    controller = new TestAccountsController(service);
  });

  it('authorizes with only the customer identifier before creating an account', async () => {
    service.createVirtualAccount.mockResolvedValueOnce({
      accountNumber: '1234567890',
      accountName: 'Test Name',
      bankName: 'Wema Bank',
      status: CrayStatus.SUCCESSFUL,
    });
    const input = {
      customerId: 'cust_1',
      provider: 'Bloc' as const,
      accountType: 'Permanent' as const,
      accountName: 'Test Name',
      email: 'test@example.com',
      firstName: 'Secret',
    };

    const result = await controller.createAccount(input, request);

    expect(result.accountNumber).toBe('1234567890');
    expect(controller.authorizeMock).toHaveBeenCalledWith({
      operation: 'accounts.create',
      request,
      resource: { customerId: 'cust_1' },
    });
    expect(controller.authorizeMock.mock.calls[0][0]).not.toHaveProperty('body');
    expect(service.createVirtualAccount).toHaveBeenCalledWith(input);
  });

  it('does not invoke the service when host authorization rejects', async () => {
    controller.authorizeMock.mockImplementationOnce(() => {
      throw new ForbiddenException();
    });

    await expect(
      controller.getAccount('cust_denied', request),
    ).rejects.toThrow(ForbiddenException);
    expect(service.getVirtualAccount).not.toHaveBeenCalled();
  });

  it('throws NotFoundException after an authorized missing lookup', async () => {
    service.getVirtualAccount.mockResolvedValueOnce(null);
    await expect(
      controller.getAccount('non_existent', request),
    ).rejects.toThrow(NotFoundException);
  });
});
