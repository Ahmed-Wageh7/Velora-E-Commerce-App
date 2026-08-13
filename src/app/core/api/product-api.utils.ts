import { environment } from "../../../environments/environment";
import { ApiResponseEnvelope } from "../../models/common/api-response.model";
import {
  ApiCategoryRef,
  ApiProductRecord,
  ApiProductsListResponse,
  ExtractProductsOptions,
  TaxonomyApiResponse,
} from "../../models/product/product-api.model";
import { TaxonomyApiCategory } from "../../models/taxonomy/taxonomy.model";

const apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function buildCategoriesUrl(): string {
  return `${apiBaseUrl}/categories`;
}

export function buildProductsListUrl(limit = 200, page = 1): string {
  return `${apiBaseUrl}/products?page=${page}&limit=${limit}`;
}

export function buildProductByIdUrl(id: number | string): string {
  return `${apiBaseUrl}/products/${id}`;
}

export function buildProductsByCategoryUrl(
  categoryId: string,
  limit = 200,
  page = 1,
): string {
  return `${apiBaseUrl}/products/category/${categoryId}?page=${page}&limit=${limit}`;
}

export function buildProductsBySubcategoryUrl(
  subcategoryId: string,
  limit = 200,
  page = 1,
): string {
  return `${apiBaseUrl}/products/subcategory/${subcategoryId}?page=${page}&limit=${limit}`;
}

// export function buildMediaUrl(value: ApiImageValue): string {
//   const rawValue = getRawImageValue(value);

//   if (!rawValue) {
//     return "";
//   }

//   if (
//     /^(https?:)?\/\//i.test(rawValue) ||
//     rawValue.startsWith("data:") ||
//     rawValue.startsWith("blob:")
//   ) {
//     return rawValue;
//   }

//   if (rawValue.startsWith("/")) {
//     return rawValue;
//   }

//   return `${apiBaseUrl}/${rawValue.replace(/^\/+/, "")}`;
// }
export function buildMediaUrl(value?: string | null): string {
  const rawValue = value?.trim() ?? "";

  if (!rawValue) {
    return "";
  }

  if (
    /^(https?:)?\/\//i.test(rawValue) ||
    rawValue.startsWith("data:") ||
    rawValue.startsWith("blob:")
  ) {
    return rawValue;
  }

  if (rawValue.startsWith("/")) {
    return rawValue;
  }
  return `${apiBaseUrl}/${rawValue.replace(/^\/+/, "")}`;
}

// export function getProductId(product: ApiProductRecord): string {
//   const value = product.id ?? product._id ?? 0;
//   return String(value);
// }
export function getProductId(product: ApiProductRecord): string {
  return product._id ?? "";
}

export function getProductQuantity(product: ApiProductRecord): number {
  return product.stock ?? 0;
}

export function getProductOriginalPrice(product: ApiProductRecord): number {
  return product.price;
}

// export function getPrimaryImageUrl(product: ApiProductRecord): string {
//   const images = normalizeImages(product.images);
//   return buildMediaUrl(images[0]);
// }
export function getPrimaryImageUrl(product: ApiProductRecord): string {
  return buildMediaUrl(product.images?.[0]);
}

export function getHoverImageUrl(product: ApiProductRecord): string {
  return getCoverImageUrl(product) || getPrimaryImageUrl(product);
}

export function getCoverImageUrl(
  product: ApiProductRecord,
): string | undefined {
  const coverImage = buildMediaUrl(product.coverImage);
  return coverImage || undefined;
}

export function getCornerImageUrl(
  _product: ApiProductRecord,
): string | undefined {
  return undefined;
}

// export function getGalleryImageUrls(product: ApiProductRecord): string[] {
//   const urls = [
//     getPrimaryImageUrl(product),
//     ...normalizeImages(product.images).map((image) => buildMediaUrl(image)),
//     getCoverImageUrl(product) ?? "",
//   ].filter(Boolean);

//   return Array.from(new Set(urls));
// }
export function getGalleryImageUrls(product: ApiProductRecord): string[] {
  const urls = [
    ...(product.images ?? []).map((image) => buildMediaUrl(image)),
    getCoverImageUrl(product) ?? "",
  ].filter(Boolean);

  return Array.from(new Set(urls));
}

export function extractApiData<T>(response: ApiResponseEnvelope<T> | T): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in (response as Record<string, unknown>)
  ) {
    return ((response as ApiResponseEnvelope<T>).data ?? null) as T;
  }

  return response as T;
}

// export function extractProducts(
//   response: ApiProductsListResponse | ApiProductRecord[],
//   options?: ExtractProductsOptions,
// ): ApiProductRecord[] {
//   const includeDeleted = options?.includeDeleted ?? false;
//   const filterProducts = (products: ApiProductRecord[] | null | undefined): ApiProductRecord[] =>
//     Array.isArray(products)
//       ? products.filter((product) => includeDeleted || !product.isDeleted)
//       : [];

//   if (Array.isArray(response)) {
//     return filterProducts(response);
//   }

//   if (Array.isArray(response.products)) {
//     return filterProducts(response.products);
//   }

//   const data = extractApiData<
//     ApiProductRecord[] | { products?: ApiProductRecord[] | null } | null | undefined
//   >(
//     response as ApiProductsListResponse,
//   );

//   if (Array.isArray(data)) {
//     return filterProducts(data);
//   }

//   if (data && typeof data === 'object' && 'products' in data) {
//     return filterProducts(data.products);
//   }

//   return [];
// }
export function extractProducts(
  response: ApiProductsListResponse,
  options?: ExtractProductsOptions,
): ApiProductRecord[] {
  const includeDeleted = options?.includeDeleted ?? false;

  return response.products.filter(
    (product) => includeDeleted || !product.isDeleted,
  );
}

// export function extractCategories(
//   response: TaxonomyApiResponse | TaxonomyApiCategory[],
// ): TaxonomyApiCategory[] {
//   if (Array.isArray(response)) {
//     return response;
//   }

//   if (Array.isArray(response.categories)) {
//     return response.categories;
//   }

//   const data = extractApiData<TaxonomyApiCategory[] | null | undefined>(
//     response,
//   );
//   return Array.isArray(data) ? data : [];
// }

export function extractCategories(
  response: TaxonomyApiResponse,
): TaxonomyApiCategory[] {
  return response.categories ?? [];
}
// function normalizeImages(images: ApiProductRecord["images"]): ApiImageValue[] {
//   if (!images) {
//     return [];
//   }

//   return Array.isArray(images) ? images : [images];
// }

// function getRawImageValue(value: ApiImageValue): string {
//   if (!value) {
//     return "";
//   }

//   if (typeof value === "string") {
//     return value.trim();
//   }

//   return String(
//     value.url ?? value.imageUrl ?? value.src ?? value.path ?? "",
//   ).trim();
// }
// function normalizeImages(images: ApiProductRecord["images"]): ApiImageValue[] {
//   if (!images) {
//     return [];
//   }

//   return Array.isArray(images) ? images : [images];
// }

// function getRawImageValue(value: ApiImageValue): string {
//   return typeof value === "string" ? value : "";
// }
