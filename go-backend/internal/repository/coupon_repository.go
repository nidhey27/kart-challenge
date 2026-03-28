package repository

import "sync"

// couponRepository holds valid coupon codes in a hash-set for O(1) lookup.
type couponRepository struct {
	mu    sync.RWMutex
	codes map[string]struct{}
}

// NewCouponRepository creates a CouponRepository pre-populated with the
// provided set of valid codes.
func NewCouponRepository(codes map[string]struct{}) CouponRepository {
	return &couponRepository{codes: codes}
}

func (r *couponRepository) IsValid(code string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, ok := r.codes[code]
	return ok
}

func (r *couponRepository) Size() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.codes)
}
