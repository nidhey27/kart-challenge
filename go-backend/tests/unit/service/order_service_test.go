package service_test

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"testing"

	"github.com/nidhey27/kart-challenge/internal/domain"
	"github.com/nidhey27/kart-challenge/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockOrderRepo is a test double for repository.OrderRepository.
type mockOrderRepo struct {
	mu    sync.Mutex
	store map[string]*domain.Order
}

func newMockOrderRepo() *mockOrderRepo {
	return &mockOrderRepo{store: make(map[string]*domain.Order)}
}

func (m *mockOrderRepo) Save(_ context.Context, o *domain.Order) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.store[o.ID] = o
	return nil
}

func (m *mockOrderRepo) FindByID(_ context.Context, id string) (*domain.Order, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.store[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return o, nil
}

// mockCouponSvc is a test double for service.CouponService.
type mockCouponSvc struct {
	validCodes map[string]struct{}
}

func (m *mockCouponSvc) Validate(code string) *domain.CouponValidationResult {
	l := len(code)
	if l < 8 {
		return &domain.CouponValidationResult{Valid: false, Reason: "coupon code too short"}
	}
	if l > 10 {
		return &domain.CouponValidationResult{Valid: false, Reason: "coupon code too long"}
	}
	if _, ok := m.validCodes[code]; !ok {
		return &domain.CouponValidationResult{Valid: false, Reason: "coupon code not found"}
	}
	return &domain.CouponValidationResult{Valid: true}
}

func buildOrderService(products []domain.Product, validCoupons ...string) service.OrderService {
	couponSet := make(map[string]struct{}, len(validCoupons))
	for _, c := range validCoupons {
		couponSet[c] = struct{}{}
	}
	return service.NewOrderService(
		&mockProductRepo{products: products},
		newMockOrderRepo(),
		&mockCouponSvc{validCodes: couponSet},
	)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

func TestOrderService_ValidOrder_NoCoupon(t *testing.T) {
	svc := buildOrderService(testProducts)
	req := &domain.OrderRequest{
		Items: []domain.OrderItem{
			{ProductID: "waffle-with-berries", Quantity: 2},
		},
	}
	order, err := svc.PlaceOrder(context.Background(), req)
	require.NoError(t, err)
	require.NotNil(t, order)
	assert.NotEmpty(t, order.ID)
	assert.Equal(t, 13.00, order.Total) // 6.50 * 2
	assert.Nil(t, order.Discount)
}

func TestOrderService_ValidOrder_WithCoupon_DiscountApplied(t *testing.T) {
	svc := buildOrderService(testProducts, "DISCOUNT1")
	req := &domain.OrderRequest{
		Items: []domain.OrderItem{
			{ProductID: "waffle-with-berries", Quantity: 2},
		},
		CouponCode: "DISCOUNT1",
	}
	order, err := svc.PlaceOrder(context.Background(), req)
	require.NoError(t, err)
	require.NotNil(t, order)
	require.NotNil(t, order.Discount)
	assert.Equal(t, 1.30, *order.Discount)  // 10% of 13.00
	assert.Equal(t, 11.70, order.Total)     // 13.00 - 1.30
}

func TestOrderService_UnknownProduct_Returns404(t *testing.T) {
	svc := buildOrderService(testProducts)
	req := &domain.OrderRequest{
		Items: []domain.OrderItem{
			{ProductID: "nonexistent-product", Quantity: 1},
		},
	}
	order, err := svc.PlaceOrder(context.Background(), req)
	assert.Nil(t, order)
	require.Error(t, err)
	var orderErr *service.OrderError
	require.True(t, errors.As(err, &orderErr))
	assert.Equal(t, http.StatusNotFound, orderErr.Code)
}

func TestOrderService_InvalidCoupon_Returns422(t *testing.T) {
	svc := buildOrderService(testProducts)
	req := &domain.OrderRequest{
		Items: []domain.OrderItem{
			{ProductID: "waffle-with-berries", Quantity: 1},
		},
		CouponCode: "BADCOUPON",
	}
	order, err := svc.PlaceOrder(context.Background(), req)
	assert.Nil(t, order)
	require.Error(t, err)
	var orderErr *service.OrderError
	require.True(t, errors.As(err, &orderErr))
	assert.Equal(t, http.StatusUnprocessableEntity, orderErr.Code)
}

func TestOrderService_EmptyItems_Returns400(t *testing.T) {
	svc := buildOrderService(testProducts)
	req := &domain.OrderRequest{Items: []domain.OrderItem{}}
	order, err := svc.PlaceOrder(context.Background(), req)
	assert.Nil(t, order)
	require.Error(t, err)
	var orderErr *service.OrderError
	require.True(t, errors.As(err, &orderErr))
	assert.Equal(t, http.StatusBadRequest, orderErr.Code)
}
