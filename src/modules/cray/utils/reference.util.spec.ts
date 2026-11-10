import { ReferenceUtil } from './reference.util';

describe('ReferenceUtil', () => {
  describe('isValidReference', () => {
    it('should return true for valid references <= 64 chars', () => {
      expect(ReferenceUtil.isValidReference('ref_12345')).toBe(true);
      expect(ReferenceUtil.isValidReference('a'.repeat(64))).toBe(true);
    });

    it('should return false for empty or too long references', () => {
      expect(ReferenceUtil.isValidReference('')).toBe(false);
      expect(ReferenceUtil.isValidReference('   ')).toBe(false);
      expect(ReferenceUtil.isValidReference('a'.repeat(65))).toBe(false);
      expect(ReferenceUtil.isValidReference(null as unknown as string)).toBe(false);
    });
  });

  describe('generate', () => {
    it('should generate unique references <= 64 chars', () => {
      const ref1 = ReferenceUtil.generate('test');
      const ref2 = ReferenceUtil.generate('test');
      expect(ref1).not.toBe(ref2);
      expect(ref1.length).toBeLessThanOrEqual(64);
      expect(ref1.startsWith('test_')).toBe(true);
    });
  });
});
