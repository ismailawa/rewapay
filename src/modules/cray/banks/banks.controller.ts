import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { BanksService } from './banks.service';
import { ValidateBankAccountDto } from './dto/validate-bank-account.dto';
import { BankItem, ValidateBankAccountResult } from '../interfaces/cray.interfaces';

@Controller('cray/banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  async getBanks(@Query('refresh') refresh?: string): Promise<BankItem[]> {
    const forceRefresh = refresh === 'true';
    return this.banksService.listBanks(forceRefresh);
  }

  @Post('verify')
  async verifyAccount(
    @Body() dto: ValidateBankAccountDto,
  ): Promise<ValidateBankAccountResult> {
    return this.banksService.validateBankAccount(dto);
  }
}

