package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nidhey27/kart-challenge/internal/config"
	"github.com/nidhey27/kart-challenge/internal/handler"
	"github.com/nidhey27/kart-challenge/internal/loader"
	"github.com/nidhey27/kart-challenge/internal/middleware"
	"github.com/nidhey27/kart-challenge/internal/repository"
	"github.com/nidhey27/kart-challenge/internal/service"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	cfg := config.Load()

	logger := buildLogger(cfg.LogLevel)
	defer logger.Sync() //nolint:errcheck

	logger.Info("starting kart-challenge go-backend", zap.String("port", cfg.Port))

	// Load coupons from gz files (two-phase hash-partitioned strategy).
	validCodes, err := loader.LoadCoupons(cfg.CouponDir, logger)
	if err != nil {
		logger.Fatal("failed to load coupons", zap.Error(err))
	}

	// Wire repositories.
	productRepo, err := repository.NewProductRepository()
	if err != nil {
		logger.Fatal("failed to initialise product repository", zap.Error(err))
	}
	orderRepo := repository.NewOrderRepository()
	couponRepo := repository.NewCouponRepository(validCodes)

	// Wire services.
	productSvc := service.NewProductService(productRepo)
	couponSvc := service.NewCouponService(couponRepo)
	orderSvc := service.NewOrderService(productRepo, orderRepo, couponSvc)

	// Wire handlers.
	productHandler := handler.NewProductHandler(productSvc, logger)
	orderHandler := handler.NewOrderHandler(orderSvc, logger)

	// Build router.
	router := buildRouter(cfg, logger, productHandler, orderHandler, couponRepo)

	addr := fmt.Sprintf(":%s", cfg.Port)
	logger.Info("listening", zap.String("addr", addr))
	if err := router.Run(addr); err != nil {
		logger.Fatal("server error", zap.Error(err))
	}
}

func buildRouter(
	cfg *config.Config,
	logger *zap.Logger,
	productHandler *handler.ProductHandler,
	orderHandler *handler.OrderHandler,
	couponRepo repository.CouponRepository,
) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.ZapLogger(logger))

	// Health check (no auth required).
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

	return r
}

func buildLogger(level string) *zap.Logger {
	var lvl zapcore.Level
	if err := lvl.UnmarshalText([]byte(level)); err != nil {
		lvl = zapcore.InfoLevel
	}

	cfg := zap.NewProductionConfig()
	cfg.Level = zap.NewAtomicLevelAt(lvl)
	logger, err := cfg.Build()
	if err != nil {
		// Last resort: use the no-op logger.
		return zap.NewNop()
	}
	return logger
}
