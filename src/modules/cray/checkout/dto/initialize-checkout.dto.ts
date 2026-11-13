import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class CheckoutCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}

/**
 * DTO for POST /api/checkout/initialize
 *
 * Validated against docs/cray-api-v1-docs.md § Hosted Checkout
 */
export class InitializeCheckoutDto {
  /** Amount to collect in major units (e.g. 1000 for 1000 NGN) */
  @IsNotEmpty()
  amount: number | string;

  /** ISO 4217 currency code (e.g. "NGN") */
  @IsString()
  @IsNotEmpty()
  currency: string;

  /**
   * Merchant unique reference — max 64 chars.
   * Must be unique per merchant.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  reference: string;

  /**
   * Default payment method presented on checkout page.
   * card → requires subaccount `token`
   * transfer → hosted bank transfer (token optional)
   * mobile_money → hosted MoMo (token optional)
   */
  @IsIn(['card', 'transfer', 'mobile_money'])
  defaultPaymentMethod: 'card' | 'transfer' | 'mobile_money';

  /** Who bears the transaction fee */
  @IsIn(['merchant', 'customer'])
  feeBearer: 'merchant' | 'customer';

  /** Customer details — required by Cray */
  @ValidateNested()
  @Type(() => CheckoutCustomerDto)
  customer: CheckoutCustomerDto;

  /**
   * Subaccount token from GET /accounts/subaccount/{id}.
   * Mandatory when defaultPaymentMethod is "card".
   * Optional for "transfer" and "mobile_money".
   */
  @IsOptional()
  @IsString()
  token?: string;

  /** Short description of the payment */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  narration?: string;

  /** Array of payment methods to display (e.g. ["card", "transfer"]) */
  @IsOptional()
  @IsString({ each: true })
  paymentMethods?: string[];

  /**
   * Post-payment callback/redirect URL.
   * Overrides account default if provided.
   */
  @IsOptional()
  @IsUrl()
  callback_url?: string;

  /** Custom key-value metadata for your own reference */
  @IsOptional()
  metadata?: Record<string, unknown>;

  // ---- Internal RewaPay fields (not sent to Cray) ----

  /** RewaPay internal customer ID */
  @IsOptional()
  @IsString()
  customerId?: string;

  /** RewaPay internal wallet ID */
  @IsOptional()
  @IsString()
  walletId?: string;
}
