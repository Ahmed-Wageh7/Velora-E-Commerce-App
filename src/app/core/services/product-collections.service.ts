import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import {
  ApiCategoryRef,
  ApiProductRecord,
  ApiProductsListResponse,
  CollectionQuery,
  ExtractProductsOptions,
  TaxonomyApiCategory,
  TaxonomyApiResponse,
  buildCategoriesUrl,
  buildProductsByCategoryUrl,
  buildProductsBySubcategoryUrl,
  buildProductsListUrl,
  extractCategories,
  extractProducts,
  getCategoryIdByName,
  getSubcategoryIdByName,
  normalizeLabel,
} from './product-api.utils';

@Injectable({
  providedIn: 'root',
})
export class ProductCollectionsService {
  private readonly http = inject(HttpClient);
  private readonly pageLimit = 200;
  private readonly categories$ = this.http.get<TaxonomyApiResponse>(buildCategoriesUrl()).pipe(
    map((response) => extractCategories(response)),
    shareReplay(1),
  );
  private readonly allProducts$ = this.getAllProductsFromApi().pipe(
    shareReplay(1),
  );
  private readonly collectionCache = new Map<string, Observable<ApiProductRecord[]>>();

  getCategories(): Observable<TaxonomyApiCategory[]> {
    return this.categories$;
  }

  getAllProducts(): Observable<ApiProductRecord[]> {
    return this.allProducts$;
  }

  getProductsByCategoryId(
    categoryId: string,
    fetchAllPages = false,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    return (fetchAllPages
      ? this.getAllCategoryProductsFromApi(categoryId, options)
      : this.http.get<ApiProductsListResponse>(buildProductsByCategoryUrl(categoryId)).pipe(
          map((response) => extractProducts(response, options)),
        )
    );
  }

  getProductsBySubcategoryId(
    subcategoryId: string,
    fetchAllPages = false,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    const request$ = fetchAllPages
      ? this.getAllSubcategoryProductsFromApi(subcategoryId, options)
      : this.http.get<ApiProductsListResponse>(buildProductsBySubcategoryUrl(subcategoryId, this.pageLimit, 1)).pipe(
          map((response) => extractProducts(response, options)),
        );

    return request$
      .pipe(
        switchMap((products) =>
          products.length
            ? of(products)
            : this.getProductsBySubcategoryFallback(subcategoryId),
        ),
        map((products) =>
          options?.includeDeleted ? products : products.filter((product) => !product.isDeleted),
        ),
      );
  }

  getProductsByQuery(
    query?: CollectionQuery,
    options?: ExtractProductsOptions & { fetchAllPages?: boolean },
  ): Observable<ApiProductRecord[]> {
    const cacheKey = JSON.stringify({ query, options });
    const cached = this.collectionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const request$ = this.categories$.pipe(
      switchMap((categories) => {
        if (!query) {
          return this.allProducts$;
        }

        if (query.subcategoryName && query.categoryName) {
          const subcategoryId = getSubcategoryIdByName(categories, query.categoryName, query.subcategoryName);

          if (subcategoryId) {
            return this.getProductsBySubcategoryId(subcategoryId, options?.fetchAllPages, options);
          }
        }

        if (query.categoryName) {
          const categoryId = getCategoryIdByName(categories, query.categoryName);

          if (categoryId) {
            return this.getProductsByCategoryId(categoryId, options?.fetchAllPages, options);
          }
        }

        return of([] as ApiProductRecord[]);
      }),
      shareReplay(1),
    );

    this.collectionCache.set(cacheKey, request$);
    return request$;
  }

  private matchesRefId(value: string | ApiCategoryRef | null | undefined, id: string): boolean {
    if (!value) {
      return false;
    }

    if (typeof value === 'string') {
      return value === id;
    }

    return value._id === id || value.id === id;
  }

  private getProductsBySubcategoryFallback(subcategoryId: string): Observable<ApiProductRecord[]> {
    return this.categories$.pipe(
      switchMap((categories) => {
        const subcategoryMeta = this.findSubcategoryMeta(categories, subcategoryId);

        return this.allProducts$.pipe(
          map((items) =>
            items.filter((item) => {
              const matchesSubcategory =
                this.matchesRefId(item.subcategory, subcategoryId) ||
                this.matchesRefName(item.subcategory, subcategoryMeta?.subcategoryName);

              if (!matchesSubcategory) {
                return false;
              }

              if (!subcategoryMeta) {
                return true;
              }

              return (
                this.matchesRefId(item.category, subcategoryMeta.categoryId) ||
                this.matchesRefName(item.category, subcategoryMeta.categoryName)
              );
            }),
          ),
        );
      }),
    );
  }

  private findSubcategoryMeta(categories: TaxonomyApiCategory[], subcategoryId: string): {
    categoryId: string;
    categoryName: string;
    subcategoryName: string;
  } | null {
    for (const category of categories) {
      const categoryId = String(category._id ?? category.id ?? '');

      for (const subcategory of category.subcategories ?? []) {
        const currentSubcategoryId = String(subcategory._id ?? subcategory.id ?? '');

        if (currentSubcategoryId !== subcategoryId) {
          continue;
        }

        return {
          categoryId,
          categoryName: category.name,
          subcategoryName: subcategory.name,
        };
      }
    }

    return null;
  }

  private matchesRefName(value: string | ApiCategoryRef | null | undefined, expectedName?: string): boolean {
    if (!value || !expectedName) {
      return false;
    }

    if (typeof value === 'string') {
      return normalizeLabel(value) === normalizeLabel(expectedName);
    }

    return normalizeLabel(value.name) === normalizeLabel(expectedName);
  }

  private getAllProductsFromApi(): Observable<ApiProductRecord[]> {
    return this.getAllPages(
      (page) => this.http.get<ApiProductsListResponse>(buildProductsListUrl(this.pageLimit, page)),
      undefined,
    );
  }

  private getAllSubcategoryProductsFromApi(
    subcategoryId: string,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    return this.getAllPages(
      (page) => this.http.get<ApiProductsListResponse>(buildProductsBySubcategoryUrl(subcategoryId, this.pageLimit, page)),
      options,
    );
  }

  private getAllCategoryProductsFromApi(
    categoryId: string,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    return this.getAllPages(
      (page) => this.http.get<ApiProductsListResponse>(buildProductsByCategoryUrl(categoryId, this.pageLimit, page)),
      options,
    );
  }

  private getAllPages(
    requestPage: (page: number) => Observable<ApiProductsListResponse>,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    return requestPage(1).pipe(
      switchMap((firstResponse) => {
        const firstPageProducts = extractProducts(firstResponse, options);
        const totalPages = this.getTotalPages(firstResponse);

        if (totalPages <= 1) {
          return of(firstPageProducts);
        }

        const remainingRequests = Array.from({ length: totalPages - 1 }, (_, index) => requestPage(index + 2));

        return forkJoin(remainingRequests).pipe(
          map((responses) =>
            this.mergeProducts([firstPageProducts, ...responses.map((response) => extractProducts(response, options))]),
          ),
        );
      }),
    );
  }

  private getTotalPages(response: ApiProductsListResponse): number {
    const pages = response.pagination?.pages;

    if (typeof pages === 'number' && pages > 0) {
      return pages;
    }

    const total = response.pagination?.total;
    const limit = response.pagination?.limit;

    if (typeof total === 'number' && typeof limit === 'number' && limit > 0) {
      return Math.ceil(total / limit);
    }

    return 1;
  }

  private mergeProducts(productPages: ApiProductRecord[][]): ApiProductRecord[] {
    const seenIds = new Set<string>();

    return productPages.flat().filter((product) => {
      const id = String(product._id ?? product.id ?? '');

      if (!id || seenIds.has(id)) {
        return false;
      }

      seenIds.add(id);
      return true;
    });
  }
}
