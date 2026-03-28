package service

import (
	"github.com/nidhey27/kart-challenge/internal/domain"
	"github.com/nidhey27/kart-challenge/internal/repository"
)

type couponService struct {
	repo repository.CouponRepository
}

// NewCouponService returns a CouponService backed by the given repository.
func NewCouponService(repo repository.CouponRepository) CouponService {
	return &couponService{repo: repo}
}

// Validate checks length constraints (8-10 chars) then delegates to the repo.
func (s *couponService) Validate(code string) *domain.CouponValidationResult {
	l := len(code)
	if l < 8 {
		return &domain.CouponValidationResult{Valid: false, Reason: "coupon code too short"}
	}
	if l > 10 {
		return &domain.CouponValidationResult{Valid: false, Reason: "coupon code too long"}
	}
	if !s.repo.IsValid(code) {
		return &domain.CouponValidationResult{Valid: false, Reason: "coupon code not found"}
	}
	return &domain.CouponValidationResult{Valid: true}
}
