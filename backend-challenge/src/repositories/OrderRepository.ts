import { Order } from '../domain/Order';
import { IOrderRepository } from './interfaces/IOrderRepository';

export class OrderRepository implements IOrderRepository {
  private readonly orders: Map<string, Order> = new Map();

  async save(order: Order): Promise<Order> {
    this.orders.set(order.id, order);
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }
}
