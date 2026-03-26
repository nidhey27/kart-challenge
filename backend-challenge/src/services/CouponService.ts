import { CouponValidationResult } from '../domain/Coupon';
import { ICouponRepository } from '../repositories/interfaces/ICouponRepository';

const MIN_LENGTH = 8;
const MAX_LENGTH = 10;

export class CouponService {
  constructor(private readonly couponRepository: ICouponRepository) {}

  validate(code: string): CouponValidationResult {
    if (code.length < MIN_LENGTH) {
      return { valid: false, reason: `Coupon code must be at least ${MIN_LENGTH} characters` };
    }

    if (code.length > MAX_LENGTH) {
      return { valid: false, reason: `Coupon code must be at most ${MAX_LENGTH} characters` };
    }

    if (!this.couponRepository.isValid(code)) {
      return { valid: false, reason: 'Coupon code is not valid' };
    }

    return { valid: true };
  }
}
