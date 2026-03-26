import { CouponRepository } from '../../../src/repositories/CouponRepository';

describe('CouponRepository', () => {
  it('returns true for valid coupon code', () => {
    const validCoupons = new Set(['ABCD1234', 'WXYZ5678']);
    const repo = new CouponRepository(validCoupons);
    expect(repo.isValid('ABCD1234')).toBe(true);
  });

  it('returns false for unknown coupon code', () => {
    const repo = new CouponRepository(new Set(['ABCD1234']));
    expect(repo.isValid('NOTEXIST')).toBe(false);
  });

  it('size returns correct count', () => {
    const validCoupons = new Set(['A', 'B', 'C']);
    const repo = new CouponRepository(validCoupons);
    expect(repo.size()).toBe(3);
  });

  it('starts empty if no set provided', () => {
    const repo = new CouponRepository();
    expect(repo.size()).toBe(0);
    expect(repo.isValid('anything')).toBe(false);
  });

  it('setValidCoupons replaces the coupon set', () => {
    const repo = new CouponRepository(new Set(['OLD1234']));
    repo.setValidCoupons(new Set(['NEW12345']));
    expect(repo.isValid('OLD1234')).toBe(false);
    expect(repo.isValid('NEW12345')).toBe(true);
  });
});
