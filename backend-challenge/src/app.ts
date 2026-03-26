import express from 'express';
import morgan from 'morgan';
import { config } from './config';
import { logger, morganStream } from './utils/logger';
import { loadCoupons } from './loaders/couponLoader';
import { ProductRepository } from './repositories/ProductRepository';
import { OrderRepository } from './repositories/OrderRepository';
import { CouponRepository } from './repositories/CouponRepository';
import { ProductService } from './services/ProductService';
import { OrderService } from './services/OrderService';
import { CouponService } from './services/CouponService';
import { ProductController } from './controllers/ProductController';
import { OrderController } from './controllers/OrderController';
import { createProductRouter } from './routes/product.routes';
import { createOrderRouter } from './routes/order.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';

async function bootstrap(): Promise<void> {
  // Load coupons before starting server
  logger.info('Starting coupon loading...');
  const validCoupons = await loadCoupons();

  // Wire up dependencies
  const productRepository = new ProductRepository();
  const orderRepository = new OrderRepository();
  const couponRepository = new CouponRepository(validCoupons);

  const productService = new ProductService(productRepository);
  const couponService = new CouponService(couponRepository);
  const orderService = new OrderService(productRepository, orderRepository, couponService);

  const productController = new ProductController(productService);
  const orderController = new OrderController(orderService);

  const app = express();

  // Middlewares
  app.use(express.json());
  app.use(morgan('combined', { stream: morganStream }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', couponsLoaded: couponRepository.size() });
  });

  // Routes
  app.use('/api/product', createProductRouter(productController));
  app.use('/api/order', createOrderRouter(orderController));

  // Global error handler
  app.use(errorHandler);

  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
