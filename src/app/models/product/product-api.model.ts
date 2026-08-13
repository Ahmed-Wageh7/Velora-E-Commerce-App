import { ApiResponseEnvelope } from "../common/api-response.model";
import { TaxonomyApiCategory } from "../taxonomy/taxonomy.model";

// export interface ApiImageObject {
//   url?: string;
//   imageUrl?: string;
//   src?: string;
//   path?: string;
// }

// export type ApiImageValue = string | ApiImageObject | null | undefined;

export interface ApiCategoryRef {
  _id?: string;
  id?: string;
  name?: string;
}

export interface ApiProductRecord {
  _id?: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  size?: number | string | null;
  images?: string[];
  coverImage?: string | null;
  category?: string | ApiCategoryRef | null;
  subcategory?: string | ApiCategoryRef | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted?: boolean;
}

export interface ApiProductsListResponse {
  page: number;
  limit: number;
  total: number;
  products: ApiProductRecord[];
}

export interface TaxonomyApiResponse extends ApiResponseEnvelope<
  TaxonomyApiCategory[]
> {
  categories?: TaxonomyApiCategory[];
}

export interface ExtractProductsOptions {
  includeDeleted?: boolean;
}
