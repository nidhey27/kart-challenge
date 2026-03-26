import { Product } from '../domain/Product';
import { IProductRepository } from '../repositories/interfaces/IProductRepository';

export class ProductService {
  constructor(private readonly productRepository: IProductRepository) {}

  async getAll(): Promise<Product[]> {
    return this.productRepository.findAll();
  }

  async getById(id: string): Promise<Product | null> {
    return this.productRepository.findById(id);
  }
}
