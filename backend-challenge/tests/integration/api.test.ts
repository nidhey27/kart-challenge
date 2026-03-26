import request from 'supertest';
import express, { Application } from 'express';
import { ProductRepository } from '../../src/repositories/ProductRepository';
import { OrderRepository } from '../../src/repositories/OrderRepository';
import { CouponRepository } from '../../src/repositories/CouponRepository';
import { ProductService } from '../../src/services/ProductService';
import { OrderService } from '../../src/services/OrderService';
import { CouponService } from '../../src/services/CouponService';
import { ProductController } from '../../src/controllers/ProductController';
import { OrderController } from '../../src/controllers/OrderController';
import { createProductRouter } from '../../src/routes/product.routes';
import { createOrderRouter } from '../../src/routes/order.routes';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware';

function buildApp(validCoupons: Set<string> = new Set(['VALIDCODE'])): Application {
  const app = express();
  app.use(express.json());

  const productRepo = new ProductRepository();
  const orderRepo = new OrderRepository();
  const couponRepo = new CouponRepository(validCoupons);

  const productService = new ProductService(productRepo);
  const couponService = new CouponService(couponRepo);
  const orderService = new OrderService(productRepo, orderRepo, couponService);

  const productCtrl = new ProductController(productService);
  const orderCtrl = new OrderController(orderService);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/product', createProductRouter(productCtrl));
  app.use('/api/order', createOrderRouter(orderCtrl));
  app.use(errorHandler);

  return app;
}

describe('Integration: /api/product', () => {
  let app: Application;

  beforeAll(() => {
    app = buildApp();
  });

  it('GET /api/product returns 200 with product list', async () => {
    const res = await request(app).get('/api/product');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/product/:id returns 200 for valid product', async () => {
    const res = await request(app).get('/api/product/waffle-with-berries');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('waffle-with-berries');
  });

  it('GET /api/product/:id returns 404 for unknown product', async () => {
    const res = await request(app).get('/api/product/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

describe('Integration: /api/order', () => {
  let app: Application;

  beforeAll(() => {
    app = buildApp();
  });

  it('POST /api/order returns 401 without api_key header', async () => {
    const res = await request(app).post('/api/order').send({
      items: [{ productId: 'waffle-with-berries', quantity: 1 }],
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/order returns 401 with wrong api_key', async () => {
    const res = await request(app)
      .post('/api/order')
      .set('api_key', 'wrongkey')
      .send({ items: [{ productId: 'waffle-with-berries', quantity: 1 }] });
    expect(res.status).toBe(401);
  });

  it('POST /api/order returns 201 for valid order', async () => {
    const res = await request(app)
      .post('/api/order')
      .set('api_key', 'apitest')
      .send({ items: [{ productId: 'waffle-with-berries', quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.total).toBe(13.0);
  });

  it('POST /api/order applies discount for valid coupon', async () => {
    const res = await request(app)
      .post('/api/order')
      .set('api_key', 'apitest')
      .send({
        items: [{ productId: 'waffle-with-berries', quantity: 1 }],
        couponCode: 'VALIDCODE',
      });
    expect(res.status).toBe(201);
    expect(res.body.discount).toBe(10);
    expect(res.body.total).toBe(5.85); // 6.50 * 0.9
  });

  it('POST /api/order returns 422 for invalid coupon', async () => {
    const res = await request(app)
      .post('/api/order')
      .set('api_key', 'apitest')
      .send({
        items: [{ productId: 'waffle-with-berries', quantity: 1 }],
        couponCode: 'BADCODE1',
      });
    expect(res.status).toBe(422);
  });

  it('POST /api/order returns 404 for unknown product', async () => {
    const res = await request(app)
      .post('/api/order')
      .set('api_key', 'apitest')
      .send({ items: [{ productId: 'nonexistent-product', quantity: 1 }] });
    expect(res.status).toBe(404);
  });

  it('POST /api/order returns 400 for missing items', async () => {
    const res = await request(app)
      .post('/api/order')
      .set('api_key', 'apitest')
      .send({ couponCode: 'VALIDCODE' });
    expect(res.status).toBe(400);
  });

  it('POST /api/order returns 400 for empty items array', async () => {
    const res = await request(app)
      .post('/api/order')
      .set('api_key', 'apitest')
      .send({ items: [] });
    expect(res.status).toBe(400);
  });
});
