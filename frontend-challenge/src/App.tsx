import { useEffect, useState, useCallback } from 'react';
import type { CartEntry, Order, Product } from './types';
import { fetchProducts, placeOrder } from './api';
import ProductCard from './components/ProductCard';
import CartPanel from './components/CartPanel';
import OrderModal from './components/OrderModal';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Map<string, CartEntry>>(new Map());
  const [order, setOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setLoadError('Could not load products. Is the backend running?'));
  }, []);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      next.set(product.id, { product, quantity: existing ? existing.quantity + 1 : 1 });
      return next;
    });
  }, []);

  const increment = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const entry = next.get(productId);
      if (entry) next.set(productId, { ...entry, quantity: entry.quantity + 1 });
      return next;
    });
  }, []);

  const decrement = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const entry = next.get(productId);
      if (!entry) return prev;
      if (entry.quantity <= 1) next.delete(productId);
      else next.set(productId, { ...entry, quantity: entry.quantity - 1 });
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const handleConfirm = async (couponCode?: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const items = [...cart.values()].map((e) => ({
        productId: e.product.id,
        quantity: e.quantity,
      }));
      const result = await placeOrder(items, couponCode);
      setOrder(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setOrder(null);
    setCart(new Map());
    setError(null);
  };

  const cartEntries = [...cart.values()];

  return (
    <>
      <main className="page">
        {/* Left: product grid */}
        <section>
          <h1 className="section-title">Desserts</h1>

          {loadError ? (
            <p style={{ color: 'var(--red)', fontWeight: 600 }}>{loadError}</p>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={cart.get(product.id)?.quantity ?? 0}
                  onAdd={() => addToCart(product)}
                  onInc={() => increment(product.id)}
                  onDec={() => decrement(product.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right: cart panel */}
        <CartPanel
          entries={cartEntries}
          onRemove={removeFromCart}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
          order={order}
        />
      </main>

      {/* Error toast */}
      {error && (
        <div
          role="alert"
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--rose-900)', color: '#fff', padding: '12px 24px',
            borderRadius: 999, fontSize: '0.875rem', fontWeight: 600, zIndex: 200,
            maxWidth: '90vw', textAlign: 'center',
          }}
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {/* Order confirmation modal */}
      {order && <OrderModal order={order} onNewOrder={handleNewOrder} />}
    </>
  );
}
