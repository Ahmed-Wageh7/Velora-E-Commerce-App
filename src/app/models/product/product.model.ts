export interface Product {
  id: string;
  detailProductId?: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity?: number;
  description: string;
  image: string;
  images?: string[];
  primaryImage?: string;
  coverImage?: string;
  cornerImage?: string;
  conerImage?: string;
  detailFolder?: string;
}
