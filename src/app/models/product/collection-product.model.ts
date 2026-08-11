import { ApiProductRecord } from './product-api.model';

export interface CollectionProductApiRecord extends ApiProductRecord {
  originalPrice?: number;
}

export interface CollectionQuery {
  categoryName?: string;
  subcategoryName?: string;
}

export interface CollectionProductOptions {
  includeDeleted?: boolean;
  fetchAllPages?: boolean;
}

export interface CollectionProductSeed {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  quantity?: number;
  primaryImage?: string;
  hoverImage?: string;
  coverImage?: string;
  cornerImage?: string;
}

export interface CollectionProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  isDeleted: boolean;
  primaryImageUrl: string;
  hoverImageUrl: string;
  primaryImageAlt: string;
  hoverImageAlt: string;
  coverImageUrl?: string;
  cornerImageUrl?: string;
}
