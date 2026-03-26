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
