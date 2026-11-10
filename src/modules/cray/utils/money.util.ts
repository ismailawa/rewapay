import Decimal from 'decimal.js';

export class MoneyUtil {
  private static readonly DECIMAL_STRING_REGEX = /^\d+\.\d{2}$/;

  /**
   * Validates whether a given amount string conforms to strict two-decimal NGN string, e.g. "100.00"
   */
  static isValidAmountString(amount: string): boolean {
    if (!amount || typeof amount !== 'string') {
      return false;
    }
    if (!this.DECIMAL_STRING_REGEX.test(amount)) {
      return false;
    }
    try {
      const dec = new Decimal(amount);
      return dec.isPositive() && !dec.isZero() && dec.isFinite();
    } catch {
      return false;
    }
  }

  /**
   * Formats any valid number, string, or Decimal into a strict two-decimal string, e.g. "100.00"
   */
  static toDecimalString(amount: string | number | Decimal): string {
    const dec = new Decimal(amount);
    return dec.toFixed(2);
  }

  /**
   * Converts major units (NGN) to minor units (Kobo) as an integer string
   */
  static toMinorUnits(amount: string | number | Decimal): string {
    const dec = new Decimal(amount);
    return dec.times(100).toFixed(0);
  }

  /**
   * Converts minor units (Kobo) to major units (NGN) as a strict two-decimal string
   */
  static fromMinorUnits(minorUnits: string | number | Decimal): string {
    const dec = new Decimal(minorUnits);
    return dec.dividedBy(100).toFixed(2);
  }

  /**
   * Compares two amounts. Returns:
   * -1 if a < b
   *  0 if a == b
   *  1 if a > b
   */
  static compare(a: string | Decimal, b: string | Decimal): number {
    const decA = new Decimal(a);
    const decB = new Decimal(b);
    return decA.comparedTo(decB);
  }

  /**
   * Checks equality of two amount strings
   */
  static equals(a: string, b: string): boolean {
    return new Decimal(a).equals(new Decimal(b));
  }
}

