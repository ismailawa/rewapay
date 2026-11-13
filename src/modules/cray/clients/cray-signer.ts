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
   * Canonicalises path and query string according to Cray v1 specifications:
   * 1. Path begins with /
   * 2. Trailing slash is removed (except root /)
   * 3. Query string parameters are URL-decoded, sorted alphabetically by key, then re-encoded
   */
  static canonicalizePath(pathWithQuery: string): string {
    if (!pathWithQuery) return '/';

    const querySeparator = pathWithQuery.indexOf('?');
    const pathPart =
      querySeparator === -1
        ? pathWithQuery
        : pathWithQuery.slice(0, querySeparator);
    const queryPart =
      querySeparator === -1 ? '' : pathWithQuery.slice(querySeparator + 1);
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

    const scalarPairs = new Map<string, string>();
    const arrayPairs: Array<{ key: string; val: string }> = [];
    const arrayIndexes = new Map<string, number>();

    for (const pair of queryPart.split('&').filter(Boolean)) {
      const separator = pair.indexOf('=');
      const rawKey = separator === -1 ? pair : pair.slice(0, separator);
      const rawValue = separator === -1 ? '' : pair.slice(separator + 1);
      // In v1 canonicalization, a literal '+' is form-encoding for a space.
      const decodedKey = decodeURIComponent(rawKey.replace(/\+/g, '%20'));
      const decodedValue = decodeURIComponent(rawValue.replace(/\+/g, '%20'));

      if (decodedKey.endsWith('[]')) {
        const baseKey = decodedKey.slice(0, -2);
        const index = arrayIndexes.get(baseKey) ?? 0;
        arrayIndexes.set(baseKey, index + 1);
        arrayPairs.push({ key: `${baseKey}[${index}]`, val: decodedValue });
      } else {
        // Cray keeps only the final value when a scalar key is repeated.
        scalarPairs.set(decodedKey, decodedValue);
      }
    }

    const pairs = [
      ...Array.from(scalarPairs, ([key, val]) => ({ key, val })),
      ...arrayPairs,
    ].map(({ key, val }) => ({
      key: this.rfc3986Encode(key),
      val: this.rfc3986Encode(val),
    }));

    pairs.sort((a, b) => {
      const byKey = a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
      return byKey === 0
        ? a.val < b.val
          ? -1
          : a.val > b.val
            ? 1
            : 0
        : byKey;
    });
    const canonicalQuery = pairs.map((p) => `${p.key}=${p.val}`).join('&');

    return `${normalizedPath}?${canonicalQuery}`;
  }

  private static rfc3986Encode(value: string): string {
    return encodeURIComponent(value).replace(
      /[!'()*]/g,
      (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  /**
   * Constructs the 5-line canonical message defined in docs.crayfi.com/v1:
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
