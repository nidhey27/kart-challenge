import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authMiddleware } from '../middlewares/auth.middleware';

export function createOrderRouter(controller: OrderController): Router {
  const router = Router();

  router.post('/', authMiddleware, controller.placeOrder);

  return router;
}
