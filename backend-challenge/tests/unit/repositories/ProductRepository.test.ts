import { ProductRepository } from '../../../src/repositories/ProductRepository';

describe('ProductRepository', () => {
  let repo: ProductRepository;

  beforeEach(() => {
    repo = new ProductRepository();
  });

  it('findAll returns all 9 products', async () => {
    const products = await repo.findAll();
    expect(products).toHaveLength(9);
  });

  it('findById returns correct product', async () => {
    const product = await repo.findById('waffle-with-berries');
    expect(product).not.toBeNull();
    expect(product!.name).toBe('Waffle with Berries');
    expect(product!.price).toBe(6.5);
  });

  it('findById returns null for unknown id', async () => {
    const product = await repo.findById('does-not-exist');
    expect(product).toBeNull();
  });

  it('findAll returns a copy, not the internal array', async () => {
    const products1 = await repo.findAll();
    const products2 = await repo.findAll();
    expect(products1).not.toBe(products2);
  });
});
