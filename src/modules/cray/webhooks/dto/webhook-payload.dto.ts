import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO for incoming Cray webhook POST payloads.
 * Validated against docs/cray-api-v2-docs.md § Webhooks
 */
export class CrayWebhookPayloadDto {
  /** Event identifier string, e.g. "collection.mobile_money.successful", "payin", "payout" */
  @IsString()
  @IsNotEmpty()
  event: string;

  /** Dynamic data payload containing transaction details */
  @IsObject()
  @IsNotEmpty()
  data: Record<string, unknown>;

  /**
   * Base64 HMAC-SHA256 signature over JSON of the data object.
   * Present on collection events.
   */
  @IsString()
  hash: string;

  /**
   * Optional key present on payout events.
   */
  @IsString()
  @IsOptional()
  key?: string;
}
