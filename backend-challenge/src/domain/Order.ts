import { Product } from './Product';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface OrderRequest {
  items: OrderItem[];
  couponCode?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  products: Product[];
  discount?: number;
  total?: number;
}
