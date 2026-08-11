import { ApiPagination, ApiResponseEnvelope } from '../common/api-response.model';
import { TaxonomyApiCategory } from '../taxonomy/taxonomy.model';

export interface ApiImageObject {
  url?: string;
  imageUrl?: string;
  src?: string;
  path?: string;
}

export type ApiImageValue = string | ApiImageObject | null | undefined;

export interface ApiCategoryRef {
  _id?: string;
  id?: string;
  name?: string;
}

export interface ApiProductRecord {
  _id?: string;
  id?: number | string;
  sku?: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  size?: number | string | null;
  stock?: number;
  images?: ApiImageValue[] | ApiImageValue;
  coverImage?: ApiImageValue;
  category?: string | ApiCategoryRef | null;
  subcategory?: string | ApiCategoryRef | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted?: boolean;
}

export interface ApiProductsListResponse
  extends ApiResponseEnvelope<ApiProductRecord[]> {
  products?: ApiProductRecord[];
  pagination?: ApiPagination;
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
}

export interface TaxonomyApiResponse
  extends ApiResponseEnvelope<TaxonomyApiCategory[]> {
  categories?: TaxonomyApiCategory[];
}

export interface ExtractProductsOptions {
  includeDeleted?: boolean;
}
