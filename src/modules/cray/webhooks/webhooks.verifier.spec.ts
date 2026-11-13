import * as crypto from 'crypto';
import { WebhooksVerifier } from './webhooks.verifier';

describe('WebhooksVerifier', () => {
  let verifier: WebhooksVerifier;
  const secret = 'test_merchant_api_key';

  beforeEach(() => {
    verifier = new WebhooksVerifier();
  });

  describe('verifyHmacSignature', () => {
    const dataObj = {
      customer_reference: 'b6f4268e-2e20-4167-af84-a13f46f8344a',
      amount: '3950.00',
      status: 'Successful',
    };

    function computeValidHash(
      data: Record<string, unknown>,
      key: string,
    ): string {
      const serialized = JSON.stringify(data);
      return crypto
        .createHmac('sha256', key)
        .update(serialized)
        .digest('base64');
    }

    it('should return true for valid HMAC signature', () => {
      const validHash = computeValidHash(dataObj, secret);
      const result = verifier.verifyHmacSignature(dataObj, validHash, secret);
      expect(result).toBe(true);
    });

    it('should return false for altered data (tamper defense)', () => {
      const validHash = computeValidHash(dataObj, secret);
      const tamperedData = { ...dataObj, amount: '99999.00' };
      const result = verifier.verifyHmacSignature(
        tamperedData,
        validHash,
        secret,
      );
      expect(result).toBe(false);
    });

    it('should return false for incorrect secret', () => {
      const validHash = computeValidHash(dataObj, secret);
      const result = verifier.verifyHmacSignature(
        dataObj,
        validHash,
        'wrong_secret',
      );
      expect(result).toBe(false);
    });

    it('should return false if expectedHash or secret is missing', () => {
      expect(verifier.verifyHmacSignature(dataObj, undefined, secret)).toBe(
        false,
      );
      expect(verifier.verifyHmacSignature(dataObj, 'somehash', undefined)).toBe(
        false,
      );
    });
  });

  describe('isIpAllowed', () => {
    it('should allow IP when in allowlist', () => {
      expect(
        verifier.isIpAllowed('192.168.1.10', ['192.168.1.10', '10.0.0.1']),
      ).toBe(true);
    });

    it('should normalize IPv4-mapped IPv6 address', () => {
      expect(
        verifier.isIpAllowed('::ffff:192.168.1.10', ['192.168.1.10']),
      ).toBe(true);
    });

    it('should allow localhost in development/test', () => {
      expect(verifier.isIpAllowed('127.0.0.1', ['localhost'])).toBe(true);
      expect(verifier.isIpAllowed('::1', ['localhost'])).toBe(true);
    });

    it('should reject unlisted IP', () => {
      expect(verifier.isIpAllowed('203.0.113.195', ['192.168.1.10'])).toBe(
        false,
      );
    });

    it('should be permissive when allowlist is empty', () => {
      expect(verifier.isIpAllowed('any.ip.address', [])).toBe(true);
    });
  });
});
