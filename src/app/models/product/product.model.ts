import { ApiImageValue } from './product-api.model';

export interface Product {
  id: string;
  detailProductId?: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity?: number;
  description: string;
  image: string;
  images?: ApiImageValue[] | ApiImageValue;
  primaryImage?: string;
  coverImage?: string;
  cornerImage?: string;
  conerImage?: string;
  detailFolder?: string;
}
