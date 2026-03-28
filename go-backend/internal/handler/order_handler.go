package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nidhey27/kart-challenge/internal/domain"
	"github.com/nidhey27/kart-challenge/internal/service"
	"go.uber.org/zap"
)

// OrderHandler handles HTTP requests for the order resource.
type OrderHandler struct {
	svc    service.OrderService
	logger *zap.Logger
}

// NewOrderHandler creates an OrderHandler.
func NewOrderHandler(svc service.OrderService, logger *zap.Logger) *OrderHandler {
	return &OrderHandler{svc: svc, logger: logger}
}

// PlaceOrder handles POST /api/order.
func (h *OrderHandler) PlaceOrder(c *gin.Context) {
	var req domain.OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order, err := h.svc.PlaceOrder(c.Request.Context(), &req)
	if err != nil {
		var orderErr *service.OrderError
		if errors.As(err, &orderErr) {
			c.JSON(orderErr.Code, gin.H{"error": orderErr.Message})
			return
		}
		h.logger.Error("place order", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusCreated, order)
}
