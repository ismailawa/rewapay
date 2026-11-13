import {
  Body,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TransfersService } from './transfers.service';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { TransferResult, TransferStatusResult } from '../interfaces/cray.interfaces';
import { CrayAuthorizedControllerBase } from '../controllers';

export abstract class CrayTransfersControllerBase extends CrayAuthorizedControllerBase {
  protected constructor(protected readonly transfersService: TransfersService) {
    super();
  }

  @Post()
  async initiateTransfer(
    @Body() dto: InitiateTransferDto,
    @Req() request: Request,
  ): Promise<TransferResult> {
    await this.assertAuthorized(request, 'transfers.create', {
      customerId: dto.customerId,
      walletId: dto.walletId,
      reference: dto.reference,
    });
    return this.transfersService.initiateTransfer(dto);
  }

  @Get(':reference')
  async getTransferStatus(
    @Param('reference') reference: string,
    @Req() request: Request,
  ): Promise<TransferStatusResult> {
    await this.assertAuthorized(request, 'transfers.read', { reference });
    return this.transfersService.getTransferStatus(reference);
  }
}
