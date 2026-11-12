import { FieldEncryptionUtil } from './field-encryption.util';

describe('FieldEncryptionUtil', () => {
  const secret = 'test-encryption-secret';

  it('encrypts and decrypts account data without deterministic ciphertext', () => {
    const first = FieldEncryptionUtil.encrypt('0123456789', secret);
    const second = FieldEncryptionUtil.encrypt('0123456789', secret);

    expect(first).not.toBe('0123456789');
    expect(first).not.toBe(second);
    expect(FieldEncryptionUtil.decrypt(first, secret)).toBe('0123456789');
    expect(FieldEncryptionUtil.decrypt(second, secret)).toBe('0123456789');
  });

  it('creates a deterministic lookup hash without exposing plaintext', () => {
    const first = FieldEncryptionUtil.lookupHash('0123456789', secret);
    expect(first).toBe(FieldEncryptionUtil.lookupHash('0123456789', secret));
    expect(first).not.toContain('0123456789');
  });
});
