import { OrderService } from '../../../src/services/OrderService';
import { CouponService } from '../../../src/services/CouponService';
import { IProductRepository } from '../../../src/repositories/interfaces/IProductRepository';
import { IOrderRepository } from '../../../src/repositories/interfaces/IOrderRepository';
import { ICouponRepository } from '../../../src/repositories/interfaces/ICouponRepository';
import { Order } from '../../../src/domain/Order';
import { Product } from '../../../src/domain/Product';

const mockProducts: Product[] = [
  { id: 'product-1', name: 'Test Product 1', category: 'Category A', price: 10.0 },
  { id: 'product-2', name: 'Test Product 2', category: 'Category B', price: 20.0 },
];

const makeMockProductRepo = (): IProductRepository => ({
  findAll: async () => [...mockProducts],
  findById: async (id: string) => mockProducts.find((p) => p.id === id) ?? null,
});

const makeMockOrderRepo = (): IOrderRepository => ({
  save: async (order: Order) => order,
  findById: async (id: string) => null,
});

const makeMockCouponRepo = (validCodes: string[]): ICouponRepository => ({
  isValid: (code: string) => validCodes.includes(code),
  size: () => validCodes.length,
});

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    const couponRepo = makeMockCouponRepo(['VALIDCODE']);
    service = new OrderService(
      makeMockProductRepo(),
      makeMockOrderRepo(),
      new CouponService(couponRepo),
    );
  });

  it('places a valid order without coupon', async () => {
    const order = await service.placeOrder({
      items: [{ productId: 'product-1', quantity: 2 }],
    });

    expect(order.id).toBeDefined();
    expect(order.total).toBe(20.0);
    expect(order.discount).toBeUndefined();
  });

  it('applies 10% discount with valid coupon', async () => {
    const order = await service.placeOrder({
      items: [{ productId: 'product-1', quantity: 1 }, { productId: 'product-2', quantity: 1 }],
      couponCode: 'VALIDCODE',
    });

    expect(order.discount).toBe(10);
    expect(order.total).toBe(27.0); // (10 + 20) * 0.9
  });

  it('throws 404 for unknown product', async () => {
    await expect(
      service.placeOrder({ items: [{ productId: 'nonexistent', quantity: 1 }] }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 422 for invalid coupon', async () => {
    await expect(
      service.placeOrder({
        items: [{ productId: 'product-1', quantity: 1 }],
        couponCode: 'BADCODE1',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 400 for empty items array', async () => {
    await expect(service.placeOrder({ items: [] })).rejects.toMatchObject({ statusCode: 400 });
  });
});
