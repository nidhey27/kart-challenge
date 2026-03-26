import { ProductService } from '../../../src/services/ProductService';
import { IProductRepository } from '../../../src/repositories/interfaces/IProductRepository';
import { Product } from '../../../src/domain/Product';

const mockProducts: Product[] = [
  { id: 'product-1', name: 'Test Product 1', category: 'Category A', price: 10.0 },
  { id: 'product-2', name: 'Test Product 2', category: 'Category B', price: 20.0 },
];

const makeMockRepo = (): IProductRepository => ({
  findAll: async () => [...mockProducts],
  findById: async (id: string) => mockProducts.find((p) => p.id === id) ?? null,
});

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    service = new ProductService(makeMockRepo());
  });

  it('getAll returns all products', async () => {
    const products = await service.getAll();
    expect(products).toHaveLength(2);
    expect(products[0].id).toBe('product-1');
  });

  it('getById returns the correct product', async () => {
    const product = await service.getById('product-2');
    expect(product).not.toBeNull();
    expect(product!.name).toBe('Test Product 2');
  });

  it('getById returns null for unknown id', async () => {
    const product = await service.getById('unknown-id');
    expect(product).toBeNull();
  });
});
