package service_test

import (
	"context"
	"testing"

	"github.com/nidhey27/kart-challenge/internal/domain"
	"github.com/nidhey27/kart-challenge/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockProductRepo is a test double for repository.ProductRepository.
type mockProductRepo struct {
	products []domain.Product
}

func (m *mockProductRepo) FindAll(_ context.Context) ([]domain.Product, error) {
	return m.products, nil
}

func (m *mockProductRepo) FindByID(_ context.Context, id string) (*domain.Product, error) {
	for i := range m.products {
		if m.products[i].ID == id {
			p := m.products[i]
			return &p, nil
		}
	}
	return nil, nil
}

var testProducts = []domain.Product{
	{ID: "waffle-with-berries", Name: "Waffle with Berries", Category: "Waffle", Price: 6.50},
	{ID: "classic-tiramisu", Name: "Classic Tiramisu", Category: "Tiramisu", Price: 5.50},
}

func TestProductService_GetAll(t *testing.T) {
	svc := service.NewProductService(&mockProductRepo{products: testProducts})
	products, err := svc.GetAll(context.Background())
	require.NoError(t, err)
	assert.Len(t, products, 2)
}

func TestProductService_GetByID_Valid(t *testing.T) {
	svc := service.NewProductService(&mockProductRepo{products: testProducts})
	p, err := svc.GetByID(context.Background(), "classic-tiramisu")
	require.NoError(t, err)
	require.NotNil(t, p)
	assert.Equal(t, "Classic Tiramisu", p.Name)
}

func TestProductService_GetByID_Unknown(t *testing.T) {
	svc := service.NewProductService(&mockProductRepo{products: testProducts})
	p, err := svc.GetByID(context.Background(), "does-not-exist")
	require.NoError(t, err)
	assert.Nil(t, p)
}
