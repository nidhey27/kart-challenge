package repository_test

import (
	"context"
	"testing"

	"github.com/nidhey27/kart-challenge/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProductRepository_FindAll_Returns9(t *testing.T) {
	repo, err := repository.NewProductRepository()
	require.NoError(t, err)

	products, err := repo.FindAll(context.Background())
	require.NoError(t, err)
	assert.Len(t, products, 9)
}

func TestProductRepository_FindByID_Valid(t *testing.T) {
	repo, err := repository.NewProductRepository()
	require.NoError(t, err)

	p, err := repo.FindByID(context.Background(), "waffle-with-berries")
	require.NoError(t, err)
	require.NotNil(t, p)
	assert.Equal(t, "Waffle with Berries", p.Name)
	assert.Equal(t, 6.50, p.Price)
}

func TestProductRepository_FindByID_Unknown(t *testing.T) {
	repo, err := repository.NewProductRepository()
	require.NoError(t, err)

	p, err := repo.FindByID(context.Background(), "no-such-product")
	require.NoError(t, err)
	assert.Nil(t, p)
}
