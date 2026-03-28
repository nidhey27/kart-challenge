package repository

import (
	"context"
	"fmt"
	"sync"

	"github.com/nidhey27/kart-challenge/internal/domain"
)

// orderRepository is a thread-safe in-memory store backed by sync.Map.
type orderRepository struct {
	store sync.Map
}

// NewOrderRepository returns a fresh in-memory OrderRepository.
func NewOrderRepository() OrderRepository {
	return &orderRepository{}
}

func (r *orderRepository) Save(_ context.Context, order *domain.Order) error {
	r.store.Store(order.ID, order)
	return nil
}

func (r *orderRepository) FindByID(_ context.Context, id string) (*domain.Order, error) {
	v, ok := r.store.Load(id)
	if !ok {
		return nil, fmt.Errorf("order %q not found", id)
	}
	return v.(*domain.Order), nil
}
