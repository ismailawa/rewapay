import * as crypto from 'crypto';

export class FieldEncryptionUtil {
  private static key(secret: string): Buffer {
    return crypto.createHash('sha256').update(secret, 'utf8').digest();
  }

  static encrypt(value: string, secret: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key(secret), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  static decrypt(value: string, secret: string): string {
    const [version, iv, tag, encrypted] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Invalid encrypted field');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key(secret), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
  }

  static lookupHash(value: string, secret: string): string {
    return crypto.createHmac('sha256', this.key(secret)).update(value).digest('hex');
  }
}
