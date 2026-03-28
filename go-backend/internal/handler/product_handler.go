package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nidhey27/kart-challenge/internal/service"
	"go.uber.org/zap"
)

// ProductHandler handles HTTP requests for the product resource.
type ProductHandler struct {
	svc    service.ProductService
	logger *zap.Logger
}

// NewProductHandler creates a ProductHandler.
func NewProductHandler(svc service.ProductService, logger *zap.Logger) *ProductHandler {
	return &ProductHandler{svc: svc, logger: logger}
}

// GetAll handles GET /api/product.
func (h *ProductHandler) GetAll(c *gin.Context) {
	products, err := h.svc.GetAll(c.Request.Context())
	if err != nil {
		h.logger.Error("get all products", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve products"})
		return
	}
	c.JSON(http.StatusOK, products)
}

// GetByID handles GET /api/product/:id.
func (h *ProductHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	product, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("get product by id", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve product"})
		return
	}
	if product == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	c.JSON(http.StatusOK, product)
}
