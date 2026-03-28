import type { Order } from '../types';

interface Props {
  order: Order;
  onNewOrder: () => void;
}

export default function OrderModal({ order, onNewOrder }: Props) {
  const subtotal = order.items.reduce((sum, item) => {
    const product = order.products.find((p) => p.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Order confirmed">
      <div className="modal">
        <div className="modal__check" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 className="modal__title">Order<br />Confirmed</h2>
        <p className="modal__subtitle">We hope you enjoyed your food!</p>

        <div className="modal__items">
          {order.items.map((item) => {
            const product = order.products.find((p) => p.id === item.productId);
            if (!product) return null;
            return (
              <div key={item.productId} className="modal-item">
                <img
                  src={product.image?.thumbnail}
                  alt={product.name}
                />
                <div className="modal-item__details">
                  <span className="modal-item__name">{product.name}</span>
                  <span className="modal-item__meta">
                    <span className="qty">{item.quantity}x</span>
                    @ ${product.price.toFixed(2)}
                  </span>
                </div>
                <span className="modal-item__price">
                  ${(product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            );
          })}

          {order.discount != null && (
            <div className="modal__discount-row">
              <span>Discount ({order.discount}%)</span>
              <span>−${(subtotal - (order.total ?? subtotal)).toFixed(2)}</span>
            </div>
          )}

          <div className="modal__total-row">
            <span>Order Total</span>
            <strong>${(order.total ?? subtotal).toFixed(2)}</strong>
          </div>
        </div>

        <button className="new-order-btn" onClick={onNewOrder}>
          Start New Order
        </button>
      </div>
    </div>
  );
}
