package service

import (
	"context"

	"github.com/nidhey27/kart-challenge/internal/domain"
)

// ProductService provides product catalogue queries.
type ProductService interface {
	GetAll(ctx context.Context) ([]domain.Product, error)
	GetByID(ctx context.Context, id string) (*domain.Product, error)
}

// OrderService handles order placement business logic.
type OrderService interface {
	PlaceOrder(ctx context.Context, req *domain.OrderRequest) (*domain.Order, error)
}

// CouponService validates coupon codes against business rules.
type CouponService interface {
	Validate(code string) *domain.CouponValidationResult
}
