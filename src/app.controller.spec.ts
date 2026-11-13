import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import {
  AppController,
  AppCrayAccountsController,
  AppCustomerGuard,
} from './app.controller';
import { AppService } from './app.service';
import { AccountsService } from './modules/cray/accounts/accounts.service';
import { CrayStatus } from './modules/cray/enums/cray.enums';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});

describe('AppCrayAccountsController example', () => {
  let controller: AppCrayAccountsController;
  let accountsService: jest.Mocked<AccountsService>;

  beforeEach(() => {
    accountsService = {
      createVirtualAccount: jest.fn(),
      getVirtualAccount: jest.fn(),
    } as unknown as jest.Mocked<AccountsService>;
    controller = new AppCrayAccountsController(accountsService);
  });

  it('requires an authenticated customer principal at the guard boundary', () => {
    const guard = new AppCustomerGuard();
    const request = { user: { customerId: 'cust_1' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    delete request.user.customerId;
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows the inherited handler only for the authenticated customer', async () => {
    accountsService.createVirtualAccount.mockResolvedValueOnce({
      accountNumber: '1234567890',
      accountName: 'Example Customer',
      bankName: 'Bloc',
      status: CrayStatus.SUCCESSFUL,
    });
    const request = {
      user: { customerId: 'cust_1' },
    } as unknown as Request;
    const input = {
      customerId: 'cust_1',
      provider: 'Bloc' as const,
      accountType: 'Permanent' as const,
      accountName: 'Example Customer',
      email: 'customer@example.com',
    };

    await controller.createAccount(input, request);

    expect(accountsService.createVirtualAccount).toHaveBeenCalledWith(input);
  });

  it('blocks missing and mismatched customer principals before service use', async () => {
    await expect(
      controller.getAccount('cust_1', {} as Request),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      controller.getAccount('cust_1', {
        user: { customerId: 'cust_2' },
      } as unknown as Request),
    ).rejects.toThrow(ForbiddenException);

    expect(accountsService.getVirtualAccount).not.toHaveBeenCalled();
  });
});
