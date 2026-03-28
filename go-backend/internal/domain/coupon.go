package domain

// CouponValidationResult carries the outcome of a coupon validation.
type CouponValidationResult struct {
	Valid  bool   `json:"valid"`
	Reason string `json:"reason,omitempty"`
}
