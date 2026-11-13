import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksVerifier {
  private readonly logger = new Logger(WebhooksVerifier.name);

  /**
   * Verifies the HMAC-SHA256 signature for Cray collection webhooks.
   *
   * Formula per docs/cray-api-v1-docs.md § Webhook Security:
   *   base64( HMAC-SHA256( JSON of "data" object, <merchant-secret-key> ) )
   *
   * @param data The "data" object from the webhook body
   * @param expectedHash The "hash" value from the webhook body
   * @param secret The v1 merchant API key
   */
  verifyHmacSignature(
    data: Record<string, unknown>,
    expectedHash: string | undefined,
    secret: string | undefined,
  ): boolean {
    if (!expectedHash || !secret) {
      this.logger.warn(
        'Missing expectedHash or webhook secret for HMAC verification',
      );
      return false;
    }

    try {
      // Serialize the data object to JSON (as Cray specifies)
      const serializedData =
        typeof data === 'string' ? data : JSON.stringify(data);

      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(serializedData);
      const computedBase64 = hmac.digest('base64');

      const expectedBuffer = Buffer.from(expectedHash, 'base64');
      const computedBuffer = Buffer.from(computedBase64, 'base64');

      if (expectedBuffer.length !== computedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
    } catch (err) {
      this.logger.error(
        `Error verifying webhook signature: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Validates client IP against configured allowlist.
   *
   * @param clientIp The incoming request IP
   * @param allowedIps The configured list of allowed IP addresses
   */
  isIpAllowed(clientIp: string | undefined, allowedIps: string[]): boolean {
    // If no allowlist configured, permissive in test/development
    if (!allowedIps || allowedIps.length === 0) {
      return true;
    }

    if (!clientIp) {
      return false;
    }

    // Clean IP: handle IPv4-mapped IPv6 like "::ffff:127.0.0.1"
    const normalizedIp = clientIp.replace(/^::ffff:/, '').trim();

    // Check direct equality or CIDR / localhost
    const isAllowed = allowedIps.some((allowed) => {
      const normalizedAllowed = allowed.trim();
      return (
        normalizedAllowed === normalizedIp ||
        (normalizedAllowed === 'localhost' &&
          (normalizedIp === '127.0.0.1' || normalizedIp === '::1'))
      );
    });

    if (!isAllowed) {
      this.logger.warn(`Rejected webhook from unlisted IP: ${normalizedIp}`);
    }

    return isAllowed;
  }
}
