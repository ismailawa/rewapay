import {
  Body,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { BanksService } from './banks.service';
import { ValidateBankAccountDto } from './dto/validate-bank-account.dto';
import { BankItem, ValidateBankAccountResult } from '../interfaces/cray.interfaces';
import { CrayAuthorizedControllerBase } from '../controllers';

export abstract class CrayBanksControllerBase extends CrayAuthorizedControllerBase {
  protected constructor(protected readonly banksService: BanksService) {
    super();
  }

  @Get()
  async getBanks(
    @Query('refresh') refresh: string | undefined,
    @Req() request: Request,
  ): Promise<BankItem[]> {
    await this.assertAuthorized(request, 'banks.list');
    const forceRefresh = refresh === 'true';
    return this.banksService.listBanks(forceRefresh);
  }

  @Post('verify')
  async verifyAccount(
    @Body() dto: ValidateBankAccountDto,
    @Req() request: Request,
  ): Promise<ValidateBankAccountResult> {
    await this.assertAuthorized(request, 'banks.validate', {
      customerId: dto.customerId,
      bankCode: dto.bankCode,
    });
    return this.banksService.validateBankAccount(dto);
  }
}
