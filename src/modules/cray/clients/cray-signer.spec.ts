import * as crypto from 'crypto';
import { CraySigner } from './cray-signer';

describe('CraySigner', () => {
  let privateKeyPem: string;
  let publicKeyPem: string;

  beforeAll(() => {
    // Generate EC keypair on P-256 curve for testing
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    privateKeyPem = privateKey;
    publicKeyPem = publicKey;
  });

  describe('hashBody', () => {
    it('should correctly hash empty body to known SHA-256 hex', () => {
      const emptyHash = CraySigner.hashBody();
      expect(emptyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should correctly hash non-empty body bytes', () => {
      const payload = JSON.stringify({ amount: '100.00', currency: 'NGN' });
      const expectedHash = crypto.createHash('sha256').update(payload).digest('hex').toLowerCase();
      expect(CraySigner.hashBody(payload)).toBe(expectedHash);
    });
  });

  describe('buildCanonicalMessage', () => {
    it('should construct exactly 5 lines joined by newline with no trailing newline', () => {
      const msg = CraySigner.buildCanonicalMessage({
        method: 'post',
        pathWithQuery: '/payout/disburse?dryRun=false',
        timestampMs: 1762791600000,
        nonce: '8e1b12b5-5d46-4e09-9f7a-f78a873130d2',
        bodyBytes: '{"amount":"100.00"}',
      });

      const lines = msg.split('\n');
      expect(lines.length).toBe(5);
      expect(lines[0]).toBe('POST');
      expect(lines[1]).toBe('/payout/disburse?dryRun=false');
      expect(lines[2]).toBe('1762791600000');
      expect(lines[3]).toBe('8e1b12b5-5d46-4e09-9f7a-f78a873130d2');
      expect(lines[4]).toBe(CraySigner.hashBody('{"amount":"100.00"}'));
      expect(msg.endsWith('\n')).toBe(false);
    });
  });

  describe('sign and verify', () => {
    it('should sign canonical message with ES256 and successfully verify with public key', () => {
      const canonicalMessage = CraySigner.buildCanonicalMessage({
        method: 'POST',
        pathWithQuery: '/api/v2/initiate',
        timestampMs: 1762791600000,
        nonce: 'test-nonce-1234',
        bodyBytes: '{"test":"payload"}',
      });

      const signature = CraySigner.sign(canonicalMessage, privateKeyPem);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');

      const isValid = CraySigner.verify(canonicalMessage, signature, publicKeyPem);
      expect(isValid).toBe(true);
    });

    it('should fail verification if canonical message was tampered with', () => {
      const canonicalMessage = CraySigner.buildCanonicalMessage({
        method: 'POST',
        pathWithQuery: '/api/v2/initiate',
        timestampMs: 1762791600000,
        nonce: 'test-nonce-1234',
        bodyBytes: '{"test":"payload"}',
      });

      const signature = CraySigner.sign(canonicalMessage, privateKeyPem);
      const tamperedMessage = canonicalMessage.replace('POST', 'GET');

      const isValid = CraySigner.verify(tamperedMessage, signature, publicKeyPem);
      expect(isValid).toBe(false);
    });

    it('should return false if signature is malformed', () => {
      const canonicalMessage = 'METHOD\nPATH\n12345\nNONCE\nHASH';
      const isValid = CraySigner.verify(canonicalMessage, 'invalid-signature-bytes', publicKeyPem);
      expect(isValid).toBe(false);
    });
  });
});

