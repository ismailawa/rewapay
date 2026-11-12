import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import type { CreateVirtualAccountInput, VirtualAccountDetails, VirtualAccountResult } from '../interfaces/cray.interfaces';

@Controller('cray/accounts/virtual')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async createAccount(@Body() dto: CreateVirtualAccountInput): Promise<VirtualAccountResult> {
    return this.accountsService.createVirtualAccount(dto);
  }

  @Get(':customerId')
  async getAccount(@Param('customerId') customerId: string): Promise<VirtualAccountDetails> {
    const account = await this.accountsService.getVirtualAccount(customerId);
    if (!account) {
      throw new NotFoundException(`Virtual account not found for customer ${customerId}`);
    }
    return account;
  }
}
