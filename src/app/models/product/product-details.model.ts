import { ApiProductRecord } from './product-api.model';
import { ApiResponseEnvelope } from '../common/api-response.model';

export interface ProductDetailsApiSection {
  title?: string;
  heading?: string;
  body?: string | string[];
  content?: string | string[];
}

export interface ProductDetailsApiRecord extends ApiProductRecord {
  title?: string;
  subtitle?: string;
  badge?: string;
  detail?: string;
  sku?: string;
  size?: string | number | null;
  productType?: string;
  status?: string;
  rating?: number;
  reviewsCount?: number;
  reviewCount?: number;
  sections?: ProductDetailsApiSection[];
}

export interface ProductDetailsApiResponse extends ApiResponseEnvelope<ProductDetailsApiRecord> {
  product?: ProductDetailsApiRecord | null;
}

export interface ProductDetailsSection {
  title: string;
  lines: string[];
}

export interface RelatedProductSummary {
  id: string;
  folder: string;
  name: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
}

export interface ProductDetails {
  id: string;
  folder: string;
  name: string;
  title: string;
  subtitle: string;
  badge: string;
  detail: string;
  description: string;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
  hoverImageUrl: string;
  galleryImageUrls: string[];
  coverImageUrl?: string;
  cornerImageUrl?: string;
  sku: string;
  size: string;
  productType: string;
  status: string;
  rating: number;
  reviewsCount: number;
  sections: ProductDetailsSection[];
  relatedProducts: RelatedProductSummary[];
}

export interface ProductLookupHint {
  id?: string;
  detailProductId?: string;
  name?: string;
  image?: string;
  description?: string;
}
