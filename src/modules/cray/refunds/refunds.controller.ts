import { Body, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CrayAuthorizedControllerBase } from '../controllers';
import type {
  RefundResult,
  RefundStatusResult,
} from '../interfaces/cray.interfaces';
import { InitiateRefundDto } from './dto/initiate-refund.dto';
import { RefundsService } from './refunds.service';

export abstract class CrayRefundsControllerBase extends CrayAuthorizedControllerBase {
  protected constructor(protected readonly refundsService: RefundsService) {
    super();
  }

  @Post()
  async initiateRefund(
    @Body() dto: InitiateRefundDto,
    @Req() request: Request,
  ): Promise<RefundResult> {
    await this.assertAuthorized(request, 'refunds.create', {
      reference: dto.reference,
    });
    return this.refundsService.initiate(dto);
  }

  @Get(':reference')
  async getRefundStatus(
    @Param('reference') reference: string,
    @Req() request: Request,
  ): Promise<RefundStatusResult> {
    await this.assertAuthorized(request, 'refunds.read', { reference });
    return this.refundsService.getStatus(reference);
  }
}
