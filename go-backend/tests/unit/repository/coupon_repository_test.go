package repository_test

import (
	"testing"

	"github.com/nidhey27/kart-challenge/internal/repository"
	"github.com/stretchr/testify/assert"
)

func TestCouponRepository_IsValid_True(t *testing.T) {
	codes := map[string]struct{}{"ABCD1234": {}}
	repo := repository.NewCouponRepository(codes)
	assert.True(t, repo.IsValid("ABCD1234"))
}

func TestCouponRepository_IsValid_False(t *testing.T) {
	codes := map[string]struct{}{"ABCD1234": {}}
	repo := repository.NewCouponRepository(codes)
	assert.False(t, repo.IsValid("NOTEXIST"))
}

func TestCouponRepository_Size(t *testing.T) {
	codes := map[string]struct{}{
		"ABCD1234": {},
		"EFGH5678": {},
		"IJKL9012": {},
	}
	repo := repository.NewCouponRepository(codes)
	assert.Equal(t, 3, repo.Size())
}
