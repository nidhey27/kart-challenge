import type { Product } from '../types';

interface Props {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}

export default function ProductCard({ product, quantity, onAdd, onInc, onDec }: Props) {
  const inCart = quantity > 0;
  const { image, category, name, price } = product;

  return (
    <div className="product-card">
      <div className={`product-card__image-wrap${inCart ? ' in-cart' : ''}`}>
        <picture>
          <source media="(min-width: 1024px)" srcSet={image?.desktop} />
          <source media="(min-width: 640px)"  srcSet={image?.tablet} />
          <img src={image?.mobile ?? image?.desktop} alt={name} loading="lazy" />
        </picture>

        {inCart ? (
          <div className="product-card__qty-btn">
            <button className="qty-circle" onClick={onDec} aria-label="Decrease quantity">
              <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
                <path d="M0 .375h10v1.25H0z" />
              </svg>
            </button>
            <span>{quantity}</span>
            <button className="qty-circle" onClick={onInc} aria-label="Increase quantity">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M4.375 0h1.25v4.375H10v1.25H5.625V10h-1.25V5.625H0v-1.25h4.375z" />
              </svg>
            </button>
          </div>
        ) : (
          <button className="product-card__add-btn" onClick={onAdd}>
            <svg width="21" height="20" viewBox="0 0 21 20" fill="none">
              <g stroke="#C73B0F" strokeWidth="1.5">
                <path d="M6.583 18.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM15.334 18.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM1.75 2.5h3.816l2.112 9.5h6.505l1.418-5.5H7.084" />
              </g>
            </svg>
            Add to Cart
          </button>
        )}
      </div>

      <div className="product-card__info">
        <span className="product-card__category">{category}</span>
        <span className="product-card__name">{name}</span>
        <span className="product-card__price">${price.toFixed(2)}</span>
      </div>
    </div>
  );
}
