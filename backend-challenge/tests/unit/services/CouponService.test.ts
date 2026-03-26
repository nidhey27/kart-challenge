import { CouponService } from '../../../src/services/CouponService';
import { ICouponRepository } from '../../../src/repositories/interfaces/ICouponRepository';

const makeMockRepo = (validCodes: string[]): ICouponRepository => ({
  isValid: (code: string) => validCodes.includes(code),
  size: () => validCodes.length,
});

describe('CouponService', () => {
  describe('validate', () => {
    it('returns valid for a code 8-10 chars present in repo', () => {
      const service = new CouponService(makeMockRepo(['ABCD1234']));
      expect(service.validate('ABCD1234')).toEqual({ valid: true });
    });

    it('returns invalid for code shorter than 8 chars', () => {
      const service = new CouponService(makeMockRepo(['SHORT']));
      const result = service.validate('SHORT');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/at least 8/i);
    });

    it('returns invalid for code longer than 10 chars', () => {
      const service = new CouponService(makeMockRepo(['TOOLONGCODE1']));
      const result = service.validate('TOOLONGCODE1');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/at most 10/i);
    });

    it('returns invalid for code not in repo', () => {
      const service = new CouponService(makeMockRepo([]));
      const result = service.validate('ABCD1234');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/not valid/i);
    });

    it('accepts exactly 8 char code present in repo', () => {
      const service = new CouponService(makeMockRepo(['12345678']));
      expect(service.validate('12345678')).toEqual({ valid: true });
    });

    it('accepts exactly 10 char code present in repo', () => {
      const service = new CouponService(makeMockRepo(['1234567890']));
      expect(service.validate('1234567890')).toEqual({ valid: true });
    });

    it('rejects code with 7 chars', () => {
      const service = new CouponService(makeMockRepo(['1234567']));
      expect(service.validate('1234567').valid).toBe(false);
    });

    it('rejects code with 11 chars', () => {
      const service = new CouponService(makeMockRepo(['12345678901']));
      expect(service.validate('12345678901').valid).toBe(false);
    });
  });
});
