import {
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { InitializeCheckoutDto } from './dto/initialize-checkout.dto';
import {
  FundingSessionResult,
  FundingStatusResult,
} from '../interfaces/cray.interfaces';
import { CrayAuthorizedControllerBase } from '../controllers';

/**
 * Unmounted controller base for hosted checkout operations.
 *
 * A host application must extend this class, add @Controller and guards,
 * implement authorize(), and register the subclass before any route exists.
 */
export abstract class CrayCheckoutControllerBase extends CrayAuthorizedControllerBase {
  protected constructor(protected readonly checkoutService: CheckoutService) {
    super();
  }

  /**
   * Creates a hosted Cray checkout session and returns the payment URL.
   *
   * The caller should redirect the customer to `paymentUrl` to complete payment.
   * POST / under the host-selected controller prefix.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCheckoutSession(
    @Body() dto: InitializeCheckoutDto,
    @Req() request: Request,
  ): Promise<FundingSessionResult> {
    await this.assertAuthorized(request, 'checkout.create', {
      customerId: dto.customerId,
      walletId: dto.walletId,
      reference: dto.reference,
    });
    return this.checkoutService.createCheckoutSession(dto);
  }

  /**
   * Queries any transaction / virtual account collection via GET /api/query/{reference}.
   * GET /query/:reference under the host-selected controller prefix.
   */
  @Get('query/:reference')
  async queryTransaction(
    @Param('reference') reference: string,
    @Req() request: Request,
  ): Promise<Record<string, unknown>> {
    await this.assertAuthorized(request, 'checkout.query', { reference });
    return this.checkoutService.queryTransaction(reference);
  }

  /**
   * Submits a direct card charge for an initialized card transaction.
   * POST /charge under the host-selected controller prefix.
   */
  @Post('charge')
  @HttpCode(HttpStatus.OK)
  async chargeCard(
    @Body('transaction_id') transactionId: string,
    @Req() request: Request,
  ): Promise<Record<string, unknown>> {
    await this.assertAuthorized(request, 'checkout.charge', { transactionId });
    return this.checkoutService.chargeCard(transactionId);
  }

  /**
   * Queries the status of a checkout session.
   *
   * Calls GET /api/checkout/query/{reference} on Cray if the session is still pending.
   * GET /:reference under the host-selected controller prefix.
   */
  @Get(':reference')
  async getCheckoutStatus(
    @Param('reference') reference: string,
    @Req() request: Request,
  ): Promise<FundingStatusResult> {
    await this.assertAuthorized(request, 'checkout.read', { reference });
    return this.checkoutService.getCheckoutStatus(reference);
  }
}
