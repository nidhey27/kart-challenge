package service

import (
	"context"
	"fmt"
	"math"
	"net/http"

	"github.com/google/uuid"
	"github.com/nidhey27/kart-challenge/internal/domain"
	"github.com/nidhey27/kart-challenge/internal/repository"
)

// OrderError wraps a business-logic error together with an HTTP status code.
type OrderError struct {
	Code    int
	Message string
}

func (e *OrderError) Error() string { return e.Message }

type orderService struct {
	productRepo repository.ProductRepository
	orderRepo   repository.OrderRepository
	couponSvc   CouponService
}

// NewOrderService returns an OrderService wired with its dependencies.
func NewOrderService(
	productRepo repository.ProductRepository,
	orderRepo repository.OrderRepository,
	couponSvc CouponService,
) OrderService {
	return &orderService{
		productRepo: productRepo,
		orderRepo:   orderRepo,
		couponSvc:   couponSvc,
	}
}

// PlaceOrder validates the request, applies any coupon discount, persists the
// order, and returns it.
func (s *orderService) PlaceOrder(ctx context.Context, req *domain.OrderRequest) (*domain.Order, error) {
	if len(req.Items) == 0 {
		return nil, &OrderError{Code: http.StatusBadRequest, Message: "order must contain at least one item"}
	}

	// Resolve products and accumulate raw total.
	products := make([]domain.Product, 0, len(req.Items))
	var rawTotal float64

	for _, item := range req.Items {
		p, err := s.productRepo.FindByID(ctx, item.ProductID)
		if err != nil {
			return nil, &OrderError{Code: http.StatusInternalServerError, Message: fmt.Sprintf("lookup product: %v", err)}
		}
		if p == nil {
			return nil, &OrderError{Code: http.StatusNotFound, Message: fmt.Sprintf("product %q not found", item.ProductID)}
		}
		products = append(products, *p)
		rawTotal += p.Price * float64(item.Quantity)
	}

	// Validate coupon when one is provided.
	var discountPtr *float64
	total := rawTotal

	if req.CouponCode != "" {
		result := s.couponSvc.Validate(req.CouponCode)
		if !result.Valid {
			return nil, &OrderError{Code: http.StatusUnprocessableEntity, Message: result.Reason}
		}
		discountAmt := math.Round(rawTotal*0.10*100) / 100
		total = math.Round((rawTotal-discountAmt)*100) / 100
		discountPtr = &discountAmt
	} else {
		total = math.Round(rawTotal*100) / 100
	}

	order := &domain.Order{
		ID:       uuid.New().String(),
		Items:    req.Items,
		Products: products,
		Discount: discountPtr,
		Total:    total,
	}

	if err := s.orderRepo.Save(ctx, order); err != nil {
		return nil, &OrderError{Code: http.StatusInternalServerError, Message: fmt.Sprintf("save order: %v", err)}
	}

	return order, nil
}
