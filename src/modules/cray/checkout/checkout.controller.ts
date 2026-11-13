import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { InitializeCheckoutDto } from './dto/initialize-checkout.dto';
import { FundingSessionResult, FundingStatusResult } from '../interfaces/cray.interfaces';

/**
 * REST controller for hosted checkout operations.
 *
 * Routes:
 *   POST /cray/checkout          → createCheckoutSession (wraps POST /api/checkout/initialize)
 *   GET  /cray/checkout/:ref     → getCheckoutStatus (wraps GET /api/checkout/query/{reference})
 */
@Controller('cray/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * Creates a hosted Cray checkout session and returns the payment URL.
   *
   * The caller should redirect the customer to `paymentUrl` to complete payment.
   * POST /cray/checkout
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCheckoutSession(@Body() dto: InitializeCheckoutDto): Promise<FundingSessionResult> {
    return this.checkoutService.createCheckoutSession(dto);
  }

  /**
   * Queries any transaction / virtual account collection via GET /api/query/{reference}.
   * GET /cray/checkout/query/:reference
   */
  @Get('query/:reference')
  async queryTransaction(@Param('reference') reference: string): Promise<Record<string, unknown>> {
    return this.checkoutService.queryTransaction(reference);
  }

  /**
   * Submits a direct card charge for an initialized card transaction.
   * POST /cray/checkout/charge
   */
  @Post('charge')
  @HttpCode(HttpStatus.OK)
  async chargeCard(@Body('transaction_id') transactionId: string): Promise<Record<string, unknown>> {
    return this.checkoutService.chargeCard(transactionId);
  }

  /**
   * Queries the status of a checkout session.
   *
   * Calls GET /api/checkout/query/{reference} on Cray if the session is still pending.
   * GET /cray/checkout/:reference
   */
  @Get(':reference')
  async getCheckoutStatus(@Param('reference') reference: string): Promise<FundingStatusResult> {
    return this.checkoutService.getCheckoutStatus(reference);
  }
}
