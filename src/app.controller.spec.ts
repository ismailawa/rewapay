import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AppController, AppCrayAccountsController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
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

  it('uses the Passport JWT guard at the controller boundary', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AppCrayAccountsController),
    ).toContain(JwtAuthGuard);
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
