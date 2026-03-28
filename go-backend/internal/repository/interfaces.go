package repository

import (
	"context"

	"github.com/nidhey27/kart-challenge/internal/domain"
)

// ProductRepository defines read access to the product catalogue.
type ProductRepository interface {
	FindAll(ctx context.Context) ([]domain.Product, error)
	FindByID(ctx context.Context, id string) (*domain.Product, error)
}

// OrderRepository defines persistence for orders.
type OrderRepository interface {
	Save(ctx context.Context, order *domain.Order) error
	FindByID(ctx context.Context, id string) (*domain.Order, error)
}

// CouponRepository defines O(1) coupon lookup.
type CouponRepository interface {
	IsValid(code string) bool
	Size() int
}
