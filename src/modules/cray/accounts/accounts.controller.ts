import { Body, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AccountsService } from './accounts.service';
import type {
  CreateVirtualAccountInput,
  VirtualAccountDetails,
  VirtualAccountResult,
} from '../interfaces/cray.interfaces';
import { CrayAuthorizedControllerBase } from '../controllers';

export abstract class CrayAccountsControllerBase extends CrayAuthorizedControllerBase {
  protected constructor(protected readonly accountsService: AccountsService) {
    super();
  }

  @Post()
  async createAccount(
    @Body() dto: CreateVirtualAccountInput,
    @Req() request: Request,
  ): Promise<VirtualAccountResult> {
    await this.assertAuthorized(request, 'accounts.create', {
      customerId: dto.customerId,
    });
    return this.accountsService.createVirtualAccount(dto);
  }

  @Get(':customerId')
  async getAccount(
    @Param('customerId') customerId: string,
    @Req() request: Request,
  ): Promise<VirtualAccountDetails> {
    await this.assertAuthorized(request, 'accounts.read', { customerId });
    const account = await this.accountsService.getVirtualAccount(customerId);
    if (!account) {
      throw new NotFoundException(
        `Virtual account not found for customer ${customerId}`,
      );
    }
    return account;
  }
}
