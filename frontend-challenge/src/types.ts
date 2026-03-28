export interface ProductImage {
  thumbnail: string;
  mobile: string;
  tablet: string;
  desktop: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: ProductImage;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  products: Product[];
  discount?: number;
  total?: number;
}

export interface CartEntry {
  product: Product;
  quantity: number;
}
