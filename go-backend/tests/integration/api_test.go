package integration_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/nidhey27/kart-challenge/internal/config"
	"github.com/nidhey27/kart-challenge/internal/handler"
	"github.com/nidhey27/kart-challenge/internal/middleware"
	"github.com/nidhey27/kart-challenge/internal/repository"
	"github.com/nidhey27/kart-challenge/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// validCouponCode is a pre-seeded coupon used across tests.
const validCouponCode = "TESTCODE1"

func buildTestRouter(t *testing.T) (*gin.Engine, *config.Config) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Port:   "8080",
		APIKey: "apitest",
	}

	logger := zap.NewNop()

	productRepo, err := repository.NewProductRepository()
	require.NoError(t, err)

	orderRepo := repository.NewOrderRepository()

	// Pre-populate coupon repo — do NOT call LoadCoupons (too slow in tests).
	couponCodes := map[string]struct{}{
		validCouponCode: {},
	}
	couponRepo := repository.NewCouponRepository(couponCodes)

	productSvc := service.NewProductService(productRepo)
	couponSvc := service.NewCouponService(couponRepo)
	orderSvc := service.NewOrderService(productRepo, orderRepo, couponSvc)

	productHandler := handler.NewProductHandler(productSvc, logger)
	orderHandler := handler.NewOrderHandler(orderSvc, logger)

	r := gin.New()
	r.Use(gin.Recovery())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":         "ok",
			"coupons_loaded": couponRepo.Size(),
		})
	})

	api := r.Group("/api")
	api.Use(middleware.APIKeyAuth(cfg.APIKey))
	{
		api.GET("/product", productHandler.GetAll)
		api.GET("/product/:id", productHandler.GetByID)
		api.POST("/order", orderHandler.PlaceOrder)
	}

	return r, cfg
}

// ── /health ───────────────────────────────────────────────────────────────────

func TestHealth(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "ok", body["status"])
	assert.EqualValues(t, 1, body["coupons_loaded"])
}

// ── GET /api/product ──────────────────────────────────────────────────────────

func TestGetProducts_NoAuth(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/product", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetProducts_OK(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/product", nil)
	req.Header.Set("api_key", "apitest")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var products []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &products))
	assert.Len(t, products, 9)
}

// ── GET /api/product/:id ──────────────────────────────────────────────────────

func TestGetProductByID_Found(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/product/waffle-with-berries", nil)
	req.Header.Set("api_key", "apitest")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var product map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &product))
	assert.Equal(t, "waffle-with-berries", product["id"])
	assert.Equal(t, "Waffle with Berries", product["name"])
}

func TestGetProductByID_NotFound(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/product/does-not-exist", nil)
	req.Header.Set("api_key", "apitest")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ── POST /api/order ───────────────────────────────────────────────────────────

func TestPlaceOrder_NoAuth(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()
	body := `{"items":[{"productId":"waffle-with-berries","quantity":1}]}`
	req, _ := http.NewRequest(http.MethodPost, "/api/order", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestPlaceOrder_OK_NoCoupon(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()
	body := `{"items":[{"productId":"waffle-with-berries","quantity":2}]}`
	req, _ := http.NewRequest(http.MethodPost, "/api/order", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api_key", "apitest")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var order map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &order))
	assert.NotEmpty(t, order["id"])
	assert.EqualValues(t, 13.00, order["total"])
	assert.Nil(t, order["discount"])
}

func TestPlaceOrder_OK_WithValidCoupon(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()

	reqBody := map[string]interface{}{
		"items":      []map[string]interface{}{{"productId": "waffle-with-berries", "quantity": 2}},
		"couponCode": validCouponCode,
	}
	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPost, "/api/order", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api_key", "apitest")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var order map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &order))
	assert.EqualValues(t, 11.70, order["total"])
	assert.NotNil(t, order["discount"])
	assert.EqualValues(t, 1.30, order["discount"])
}

func TestPlaceOrder_InvalidCoupon_422(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()

	reqBody := map[string]interface{}{
		"items":      []map[string]interface{}{{"productId": "waffle-with-berries", "quantity": 1}},
		"couponCode": "BADCOUPON",
	}
	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPost, "/api/order", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api_key", "apitest")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

func TestPlaceOrder_UnknownProduct_404(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()

	reqBody := map[string]interface{}{
		"items": []map[string]interface{}{{"productId": "ghost-product", "quantity": 1}},
	}
	bodyBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest(http.MethodPost, "/api/order", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api_key", "apitest")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestPlaceOrder_BadBody_400(t *testing.T) {
	r, _ := buildTestRouter(t)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/order", bytes.NewBufferString(`{invalid json}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api_key", "apitest")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
