import { MoneyUtil } from './money.util';

describe('MoneyUtil', () => {
  describe('isValidAmountString', () => {
    it('should return true for valid 2-decimal string amounts', () => {
      expect(MoneyUtil.isValidAmountString('100.00')).toBe(true);
      expect(MoneyUtil.isValidAmountString('0.50')).toBe(true);
      expect(MoneyUtil.isValidAmountString('1250000.75')).toBe(true);
    });

    it('should return false for invalid formats, zero, negatives, or floats', () => {
      expect(MoneyUtil.isValidAmountString('100')).toBe(false);
      expect(MoneyUtil.isValidAmountString('100.0')).toBe(false);
      expect(MoneyUtil.isValidAmountString('100.000')).toBe(false);
      expect(MoneyUtil.isValidAmountString('0.00')).toBe(false);
      expect(MoneyUtil.isValidAmountString('-10.00')).toBe(false);
      expect(MoneyUtil.isValidAmountString('abc')).toBe(false);
      expect(MoneyUtil.isValidAmountString(100 as unknown as string)).toBe(false);
    });
  });

  describe('toDecimalString', () => {
    it('should format number or string to 2 decimal places', () => {
      expect(MoneyUtil.toDecimalString(100)).toBe('100.00');
      expect(MoneyUtil.toDecimalString('250.5')).toBe('250.50');
      expect(MoneyUtil.toDecimalString('12.345')).toBe('12.35');
    });
  });

  describe('toMinorUnits & fromMinorUnits', () => {
    it('should accurately convert between Naira (major) and Kobo (minor) without floating point loss', () => {
      expect(MoneyUtil.toMinorUnits('100.00')).toBe('10000');
      expect(MoneyUtil.toMinorUnits('0.05')).toBe('5');
      expect(MoneyUtil.fromMinorUnits('10000')).toBe('100.00');
      expect(MoneyUtil.fromMinorUnits('5')).toBe('0.05');
      expect(MoneyUtil.fromMinorUnits('123456789')).toBe('1234567.89');
    });
  });

  describe('comparison', () => {
    it('should compare amounts accurately', () => {
      expect(MoneyUtil.compare('100.00', '50.00')).toBe(1);
      expect(MoneyUtil.compare('50.00', '100.00')).toBe(-1);
      expect(MoneyUtil.compare('100.00', '100.00')).toBe(0);
      expect(MoneyUtil.equals('100.00', '100.00')).toBe(true);
      expect(MoneyUtil.equals('100.00', '100.01')).toBe(false);
    });
  });
});

