package service_test

import (
	"testing"

	"github.com/nidhey27/kart-challenge/internal/service"
	"github.com/stretchr/testify/assert"
)

// mockCouponRepo is a test double for repository.CouponRepository.
type mockCouponRepo struct {
	codes map[string]struct{}
}

func (m *mockCouponRepo) IsValid(code string) bool {
	_, ok := m.codes[code]
	return ok
}

func (m *mockCouponRepo) Size() int { return len(m.codes) }

func newMockCouponRepo(codes ...string) *mockCouponRepo {
	m := &mockCouponRepo{codes: make(map[string]struct{}, len(codes))}
	for _, c := range codes {
		m.codes[c] = struct{}{}
	}
	return m
}

// ── Tests ─────────────────────────────────────────────────────────────────────

func TestCouponService_Valid_InRepo(t *testing.T) {
	svc := service.NewCouponService(newMockCouponRepo("ABCD1234"))
	result := svc.Validate("ABCD1234")
	assert.True(t, result.Valid)
	assert.Empty(t, result.Reason)
}

func TestCouponService_TooShort(t *testing.T) {
	svc := service.NewCouponService(newMockCouponRepo())
	result := svc.Validate("ABC123")
	assert.False(t, result.Valid)
	assert.Equal(t, "coupon code too short", result.Reason)
}

func TestCouponService_TooLong(t *testing.T) {
	svc := service.NewCouponService(newMockCouponRepo())
	result := svc.Validate("ABCD12345678")
	assert.False(t, result.Valid)
	assert.Equal(t, "coupon code too long", result.Reason)
}

func TestCouponService_ValidLength_NotInRepo(t *testing.T) {
	svc := service.NewCouponService(newMockCouponRepo("DIFFERENT"))
	result := svc.Validate("ABCD1234")
	assert.False(t, result.Valid)
	assert.Equal(t, "coupon code not found", result.Reason)
}

func TestCouponService_Exactly8Chars(t *testing.T) {
	svc := service.NewCouponService(newMockCouponRepo("12345678"))
	result := svc.Validate("12345678")
	assert.True(t, result.Valid)
}

func TestCouponService_Exactly10Chars(t *testing.T) {
	svc := service.NewCouponService(newMockCouponRepo("1234567890"))
	result := svc.Validate("1234567890")
	assert.True(t, result.Valid)
}
