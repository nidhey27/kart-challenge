import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { OrderRequest } from '../domain/Order';

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  placeOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderRequest: OrderRequest = req.body;

      if (!orderRequest || !Array.isArray(orderRequest.items)) {
        const err = new Error('Invalid request body: items array is required');
        (err as any).statusCode = 400;
        throw err;
      }

      const order = await this.orderService.placeOrder(orderRequest);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  };
}
