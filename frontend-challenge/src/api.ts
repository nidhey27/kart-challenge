import type { Order, Product } from './types';

const API_KEY = 'apitest';

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/product');
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

export async function placeOrder(
  items: { productId: string; quantity: number }[],
  couponCode?: string,
): Promise<Order> {
  const body: Record<string, unknown> = { items };
  if (couponCode) body.couponCode = couponCode;

  const res = await fetch('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', api_key: API_KEY },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Order failed' }));
    throw new Error(err.error ?? 'Order failed');
  }

  return res.json();
}
