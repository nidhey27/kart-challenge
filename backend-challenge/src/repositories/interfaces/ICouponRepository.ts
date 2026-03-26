export interface ICouponRepository {
  isValid(code: string): boolean;
  size(): number;
}
