import { ApiProductRecord } from '../product/product-api.model';

export interface CartItem {
  id: string;
  productId: string;
  detailProductId?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  coverImage: string | null;
  images: string[];
  quantity: number;
  detailFolder?: string;
}

export interface CartApiItem {
  cartItemId: string;
  productId: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  coverImage: string | null;
  images: string[];
  quantity: number;
  detailFolder?: string;
}

export interface CartResponse {
  cart: {
    items: CartApiResponseItem[];
  };
}

export interface CartApiResponseItem {
  _id: string;
  product: ApiProductRecord;
  quantity: number;
  price: number;
}

export interface CartMutationResponse {
  message: string;
  cart: unknown;
}
