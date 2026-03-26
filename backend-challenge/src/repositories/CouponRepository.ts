import { ICouponRepository } from './interfaces/ICouponRepository';

export class CouponRepository implements ICouponRepository {
  private validCoupons: Set<string>;

  constructor(validCoupons: Set<string> = new Set()) {
    this.validCoupons = validCoupons;
  }

  isValid(code: string): boolean {
    return this.validCoupons.has(code);
  }

  size(): number {
    return this.validCoupons.size;
  }

  setValidCoupons(coupons: Set<string>): void {
    this.validCoupons = coupons;
  }
}
