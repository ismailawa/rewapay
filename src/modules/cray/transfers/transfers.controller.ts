import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { TransferResult, TransferStatusResult } from '../interfaces/cray.interfaces';

@Controller('cray/transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  async initiateTransfer(
    @Body() dto: InitiateTransferDto,
  ): Promise<TransferResult> {
    return this.transfersService.initiateTransfer(dto);
  }

  @Get(':reference')
  async getTransferStatus(
    @Param('reference') reference: string,
  ): Promise<TransferStatusResult> {
    return this.transfersService.getTransferStatus(reference);
  }
}

