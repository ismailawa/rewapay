import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { CrayStatus } from '../enums/cray.enums';

describe('AccountsController', () => {
  let controller: AccountsController;
  let service: jest.Mocked<AccountsService>;

  beforeEach(async () => {
    const mockService = {
      createVirtualAccount: jest.fn(),
      getVirtualAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
    service = module.get(AccountsService);
  });

  it('should call accountsService.createVirtualAccount on POST', async () => {
    service.createVirtualAccount.mockResolvedValueOnce({
      accountNumber: '1234567890',
      accountName: 'Test Name',
      bankName: 'Wema Bank',
      status: CrayStatus.SUCCESSFUL,
    });

    const result = await controller.createAccount({
      customerId: 'cust_1',
      provider: 'Bloc',
      accountType: 'Permanent',
      accountName: 'Test Name',
      email: 'test@example.com',
    });

    expect(result.accountNumber).toBe('1234567890');
    expect(service.createVirtualAccount).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException if account not found on GET :customerId', async () => {
    service.getVirtualAccount.mockResolvedValueOnce(null);

    await expect(controller.getAccount('non_existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
