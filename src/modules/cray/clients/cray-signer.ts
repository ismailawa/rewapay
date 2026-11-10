import * as crypto from 'crypto';

export interface CanonicalMessageParams {
  method: string;
  pathWithQuery: string;
  timestampMs: number | string;
  nonce: string;
  bodyBytes?: Buffer | string;
}

export class CraySigner {
  /**
   * Computes the lowercase hexadecimal SHA-256 hash of the exact request body bytes.
   * If body is empty or undefined, hashes an empty buffer.
   */
  static hashBody(body?: Buffer | string): string {
    const hash = crypto.createHash('sha256');
    if (body) {
      hash.update(body);
    } else {
      hash.update('');
    }
    return hash.digest('hex').toLowerCase();
  }

  /**
   * Constructs the 5-line canonical message defined in PRD Section 19A.1:
   * METHOD\n
   * PATH_WITH_QUERY\n
   * TIMESTAMP_MS\n
   * NONCE_UUID\n
   * BODY_SHA256_HEX
   *
   * Exactly 5 lines joined by \n with no trailing newline.
   */
  static buildCanonicalMessage(params: CanonicalMessageParams): string {
    const method = params.method.toUpperCase().trim();
    const pathWithQuery = params.pathWithQuery.trim();
    const timestampMs = params.timestampMs.toString().trim();
    const nonce = params.nonce.trim();
    const bodySha256Hex = this.hashBody(params.bodyBytes);

    return [method, pathWithQuery, timestampMs, nonce, bodySha256Hex].join('\n');
  }

  /**
   * Signs a canonical message using ES256 (ECDSA with SHA-256 on P-256 curve).
   * Returns a DER-encoded, Base64-encoded signature.
   *
   * @param canonicalMessage The 5-line canonical string
   * @param privateKeyPem PEM formatted EC private key (SPKI/PKCS#8)
   */
  static sign(canonicalMessage: string, privateKeyPem: string): string {
    const sign = crypto.createSign('sha256');
    sign.update(Buffer.from(canonicalMessage, 'utf8'));
    // In Node.js crypto, default dsaEncoding for EC is 'der'
    const signatureDer = sign.sign({
      key: privateKeyPem,
      dsaEncoding: 'der',
    });
    return signatureDer.toString('base64');
  }

  /**
   * Verifies an ES256 signature against a canonical message.
   *
   * @param canonicalMessage The 5-line canonical string
   * @param signatureBase64 The Base64-encoded DER signature
   * @param publicKeyPem PEM formatted EC public key (SPKI)
   */
  static verify(
    canonicalMessage: string,
    signatureBase64: string,
    publicKeyPem: string,
  ): boolean {
    try {
      const verify = crypto.createVerify('sha256');
      verify.update(Buffer.from(canonicalMessage, 'utf8'));
      const signatureDer = Buffer.from(signatureBase64, 'base64');
      return verify.verify(
        {
          key: publicKeyPem,
          dsaEncoding: 'der',
        },
        signatureDer,
      );
    } catch {
      return false;
    }
  }
}
