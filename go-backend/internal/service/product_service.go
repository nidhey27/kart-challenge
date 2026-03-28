package service

import (
	"context"

	"github.com/nidhey27/kart-challenge/internal/domain"
	"github.com/nidhey27/kart-challenge/internal/repository"
)

type productService struct {
	repo repository.ProductRepository
}

// NewProductService returns a ProductService backed by the given repository.
func NewProductService(repo repository.ProductRepository) ProductService {
	return &productService{repo: repo}
}

func (s *productService) GetAll(ctx context.Context) ([]domain.Product, error) {
	return s.repo.FindAll(ctx)
}

func (s *productService) GetByID(ctx context.Context, id string) (*domain.Product, error) {
	return s.repo.FindByID(ctx, id)
}
