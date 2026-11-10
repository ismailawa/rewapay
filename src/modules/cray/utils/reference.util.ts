import { randomUUID } from 'crypto';

export class ReferenceUtil {
  private static readonly MAX_REFERENCE_LENGTH = 64;

  static isValidReference(ref: string): boolean {
    if (!ref || typeof ref !== 'string') {
      return false;
    }
    const trimmed = ref.trim();
    return trimmed.length > 0 && trimmed.length <= this.MAX_REFERENCE_LENGTH;
  }

  static generate(prefix = 'cray'): string {
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const id = randomUUID().replace(/-/g, '');
    const timestamp = Date.now().toString(36);
    const combined = `${cleanPrefix}_${timestamp}_${id}`;
    return combined.slice(0, this.MAX_REFERENCE_LENGTH);
  }
}

