import { useState } from 'react';
import type { CartEntry, Order } from '../types';

interface Props {
  entries: CartEntry[];
  onRemove: (productId: string) => void;
  onConfirm: (couponCode?: string) => Promise<void>;
  isSubmitting: boolean;
  orderError: string | null;
  order: Order | null;
}

export default function CartPanel({ entries, onRemove, onConfirm, isSubmitting, orderError }: Props) {
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const totalItems = entries.reduce((s, e) => s + e.quantity, 0);
  const subtotal = entries.reduce((s, e) => s + e.product.price * e.quantity, 0);

  const handleApplyCoupon = () => {
    const code = coupon.trim();
    if (!code) return;
    if (code.length < 8 || code.length > 10) {
      setCouponMsg({ text: 'Code must be 8–10 characters.', type: 'error' });
    } else {
      setCouponMsg({ text: 'Will be applied at checkout.', type: 'success' });
    }
  };

  // Always send whatever is in the input — no separate "Apply" step required
  const handleConfirm = async () => {
    await onConfirm(coupon.trim() || undefined);
  };

  return (
    <aside className="cart-panel">
      <h2 className="cart-panel__title">Your Cart ({totalItems})</h2>

      {entries.length === 0 ? (
        <div className="cart-empty">
          <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 8h18.4l12.5 56h62.6l10-40H38" stroke="#AD8A85" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="53" cy="112" r="8" stroke="#AD8A85" strokeWidth="4"/>
            <circle cx="91" cy="112" r="8" stroke="#AD8A85" strokeWidth="4"/>
          </svg>
          <p>Your added items will appear here</p>
        </div>
      ) : (
        <>
          <ul className="cart-items">
            {entries.map(({ product, quantity }) => (
              <li key={product.id} className="cart-item">
                <div className="cart-item__left">
                  <span className="cart-item__name">{product.name}</span>
                  <div className="cart-item__meta">
                    <span className="cart-item__qty">{quantity}x</span>
                    <span className="cart-item__unit-price">@ ${product.price.toFixed(2)}</span>
                    <span className="cart-item__subtotal">${(product.price * quantity).toFixed(2)}</span>
                  </div>
                </div>
                <button
                  className="cart-item__remove"
                  onClick={() => onRemove(product.id)}
                  aria-label={`Remove ${product.name}`}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M8.536 1.464 5 5l3.536 3.536-.707.707L4.293 5.707.757 9.243l-.707-.707L3.586 5 .05 1.464l.707-.707L4.293 4.293 7.829.757l.707.707Z"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          {/* Coupon */}
          <div className="coupon-wrap">
            <div className="coupon-row">
              <input
                className={`coupon-input${couponMsg?.type === 'error' ? ' error' : ''}`}
                type="text"
                placeholder="Promo code"
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value);
                  setCouponMsg(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              />
              <button className="coupon-apply-btn" onClick={handleApplyCoupon}>
                Apply
              </button>
            </div>
            {couponMsg && (
              <span className={`coupon-msg ${couponMsg.type}`}>{couponMsg.text}</span>
            )}
          </div>

          {/* Total */}
          <div className="order-total-row">
            <span>Order Total</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>

          <div className="carbon-note">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 1C5.03 1 1 5.03 1 10s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9Zm0 16.2A7.2 7.2 0 1 1 10 2.8a7.2 7.2 0 0 1 0 14.4Z" fill="#1EA557"/>
              <path d="M10 6a4 4 0 0 0-3 6.65V14h6v-1.35A4 4 0 0 0 10 6Z" fill="#1EA557"/>
            </svg>
            This is a <strong>carbon neutral</strong> delivery
          </div>

          {orderError && (
            <p className="cart-order-error">{orderError}</p>
          )}

          <button
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={isSubmitting || entries.length === 0}
          >
            {isSubmitting ? 'Placing order…' : 'Confirm Order'}
          </button>
        </>
      )}
    </aside>
  );
}
