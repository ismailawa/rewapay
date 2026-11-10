import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { SubmitVirtualAccountOtpDto } from './dto/submit-otp.dto';
import { VirtualAccountDetails, VirtualAccountResult } from '../interfaces/cray.interfaces';

@Controller('cray/accounts/virtual')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async createAccount(@Body() dto: CreateVirtualAccountDto): Promise<VirtualAccountResult> {
    return this.accountsService.createVirtualAccount(dto);
  }

  @Post('otp')
  async submitOtp(@Body() dto: SubmitVirtualAccountOtpDto): Promise<{ status: string }> {
    return this.accountsService.submitVirtualAccountOtp(dto);
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

