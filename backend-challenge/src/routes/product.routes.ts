import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

export function createProductRouter(controller: ProductController): Router {
  const router = Router();

  router.get('/', controller.getAll);
  router.get('/:productId', controller.getById);

  return router;
}
