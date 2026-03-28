package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/nidhey27/kart-challenge/internal/assets"
	"github.com/nidhey27/kart-challenge/internal/domain"
)

// productRepository is the in-memory implementation backed by the embedded JSON.
type productRepository struct {
	products []domain.Product
	index    map[string]*domain.Product
}

// NewProductRepository loads products from the embedded JSON and returns a
// ProductRepository ready for use.
func NewProductRepository() (ProductRepository, error) {
	var products []domain.Product
	if err := json.Unmarshal(assets.ProductsJSON, &products); err != nil {
		return nil, fmt.Errorf("parse products.json: %w", err)
	}

	index := make(map[string]*domain.Product, len(products))
	for i := range products {
		p := products[i]
		index[p.ID] = &p
	}

	return &productRepository{
		products: products,
		index:    index,
	}, nil
}

func (r *productRepository) FindAll(_ context.Context) ([]domain.Product, error) {
	out := make([]domain.Product, len(r.products))
	copy(out, r.products)
	return out, nil
}

func (r *productRepository) FindByID(_ context.Context, id string) (*domain.Product, error) {
	p, ok := r.index[id]
	if !ok {
		return nil, nil
	}
	cp := *p
	return &cp, nil
}
