import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const products = await this.productService.getAll();
      res.json(products);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.productService.getById(req.params.productId);
      if (!product) {
        const err = new Error(`Product not found: ${req.params.productId}`);
        (err as any).statusCode = 404;
        throw err;
      }
      res.json(product);
    } catch (err) {
      next(err);
    }
  };
}
