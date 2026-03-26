import { Product } from '../domain/Product';
import { IProductRepository } from './interfaces/IProductRepository';
import productsData from '../../data/products.json';

export class ProductRepository implements IProductRepository {
  private readonly products: Product[];

  constructor() {
    this.products = productsData as Product[];
  }

  async findAll(): Promise<Product[]> {
    return [...this.products];
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) ?? null;
  }
}
