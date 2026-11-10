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
   * If body is empty or undefined, returns hash of empty string.
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
   * Canonicalises path and query string according to Cray v2 specifications:
   * 1. Path begins with /
   * 2. Trailing slash is removed (except root /)
   * 3. Query string parameters are URL-decoded, sorted alphabetically by key, then re-encoded
   */
  static canonicalizePath(pathWithQuery: string): string {
    if (!pathWithQuery) return '/';

    const [pathPart, queryPart] = pathWithQuery.split('?');
    let normalizedPath = pathPart.trim();
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
    if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    if (!queryPart || queryPart.trim() === '') {
      return normalizedPath;
    }

    // Split on '&' and sort canonical pairs
    const pairs = queryPart
      .split('&')
      .filter((p) => p.length > 0)
      .map((pair) => {
        const [k, v = ''] = pair.split('=');
        const decodedKey = decodeURIComponent(k.replace(/\+/g, '%20'));
        const decodedVal = decodeURIComponent(v.replace(/\+/g, '%20'));
        return {
          key: encodeURIComponent(decodedKey),
          val: encodeURIComponent(decodedVal),
        };
      });

    pairs.sort((a, b) => a.key.localeCompare(b.key));
    const canonicalQuery = pairs.map((p) => `${p.key}=${p.val}`).join('&');

    return `${normalizedPath}?${canonicalQuery}`;
  }

  /**
   * Constructs the 5-line canonical message defined in docs.crayfi.com/v2:
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
    const pathWithQuery = this.canonicalizePath(params.pathWithQuery);
    const timestampMs = params.timestampMs.toString().trim();
    const nonce = params.nonce.trim();
    const bodySha256Hex = this.hashBody(params.bodyBytes);

    return [method, pathWithQuery, timestampMs, nonce, bodySha256Hex].join('\n');
  }

  /**
   * Formats the official X-Signature header:
   * t=<unix-ms>,n=<uuid>,kid=<key-id>,v1=<base64-signature>
   */
  static formatHeader(params: {
    timestampMs: number | string;
    nonce: string;
    signature: string;
    keyId?: string;
  }): string {
    const parts = [
      `t=${params.timestampMs}`,
      `n=${params.nonce}`,
      ...(params.keyId ? [`kid=${params.keyId}`] : []),
      `v1=${params.signature}`,
    ];
    return parts.join(',');
  }

  /**
   * Signs a canonical message using ES256 (ECDSA with SHA-256 on P-256 curve).
   * Returns a DER-encoded, Base64-encoded signature.
   */
  static sign(canonicalMessage: string, privateKeyPem: string): string {
    const sign = crypto.createSign('sha256');
    sign.update(Buffer.from(canonicalMessage, 'utf8'));
    const signatureDer = sign.sign({
      key: privateKeyPem,
      dsaEncoding: 'der',
    });
    return signatureDer.toString('base64');
  }

  /**
   * Verifies an ES256 signature against a canonical message.
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
