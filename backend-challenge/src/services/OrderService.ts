import { v4 as uuidv4 } from 'uuid';
import { Order, OrderRequest } from '../domain/Order';
import { IProductRepository } from '../repositories/interfaces/IProductRepository';
import { IOrderRepository } from '../repositories/interfaces/IOrderRepository';
import { CouponService } from './CouponService';

const COUPON_DISCOUNT_PERCENT = 10;

export class OrderService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly orderRepository: IOrderRepository,
    private readonly couponService: CouponService,
  ) {}

  async placeOrder(request: OrderRequest): Promise<Order> {
    if (!request.items || request.items.length === 0) {
      const err = new Error('Order must contain at least one item');
      (err as any).statusCode = 400;
      throw err;
    }

    // Validate all products exist
    const products = await Promise.all(
      request.items.map(async (item) => {
        const product = await this.productRepository.findById(item.productId);
        if (!product) {
          const err = new Error(`Product not found: ${item.productId}`);
          (err as any).statusCode = 404;
          throw err;
        }
        return product;
      }),
    );

    // Validate coupon if provided
    let discountPercent: number | undefined;
    if (request.couponCode) {
      const result = this.couponService.validate(request.couponCode);
      if (!result.valid) {
        const err = new Error(result.reason ?? 'Invalid coupon code');
        (err as any).statusCode = 422;
        throw err;
      }
      discountPercent = COUPON_DISCOUNT_PERCENT;
    }

    // Calculate total
    let subtotal = 0;
    for (const item of request.items) {
      const product = products.find((p) => p.id === item.productId)!;
      subtotal += product.price * item.quantity;
    }

    const total =
      discountPercent !== undefined
        ? subtotal * (1 - discountPercent / 100)
        : subtotal;

    const order: Order = {
      id: uuidv4(),
      items: request.items,
      products,
      discount: discountPercent,
      total: Math.round(total * 100) / 100,
    };

    return this.orderRepository.save(order);
  }
}
