import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
  throwError,
} from "rxjs";
import {
  buildProductsByCategoryUrl,
  buildProductsBySubcategoryUrl,
  buildProductsListUrl,
  extractProducts,
} from "./product-api.utils";
import {
  ApiProductRecord,
  ApiProductsListResponse,
  ExtractProductsOptions,
} from "../../models/product/product-api.model";

@Injectable({
  providedIn: "root",
})
export class ProductCollectionsService {
  private readonly http = inject(HttpClient);
  private readonly pageLimit = 200;
  private readonly allProductsCache = new Map<
    string,
    Observable<ApiProductRecord[]>
  >();
  private readonly categoryCache = new Map<
    string,
    Observable<ApiProductRecord[]>
  >();
  private readonly subcategoryCache = new Map<
    string,
    Observable<ApiProductRecord[]>
  >();

  getAllProducts(
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    const cacheKey = JSON.stringify({ options });

    return this.getOrCreateCachedRequest(this.allProductsCache, cacheKey, () =>
      this.getAllProductsFromApi(options),
    );
  }

  getProductsByCategoryId(
    categoryId: string,
    fetchAllPages = false,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    const cacheKey = JSON.stringify({ categoryId, fetchAllPages, options });

    return this.getOrCreateCachedRequest(this.categoryCache, cacheKey, () =>
      fetchAllPages
        ? this.getAllCategoryProductsFromApi(categoryId, options)
        : this.http
            .get<ApiProductsListResponse>(
              buildProductsByCategoryUrl(categoryId),
            )
            .pipe(map((response) => extractProducts(response, options))),
    );
  }

  getProductsBySubcategoryId(
    subcategoryId: string,
    fetchAllPages = false,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    const cacheKey = JSON.stringify({ subcategoryId, fetchAllPages, options });

    return this.getOrCreateCachedRequest(
      this.subcategoryCache,
      cacheKey,
      () => {
        const request$ = fetchAllPages
          ? this.getAllSubcategoryProductsFromApi(subcategoryId, options)
          : this.http
              .get<ApiProductsListResponse>(
                buildProductsBySubcategoryUrl(subcategoryId, this.pageLimit, 1),
              )
              .pipe(map((response) => extractProducts(response, options)));

        return request$.pipe(
          map((products) =>
            options?.includeDeleted
              ? products
              : products.filter((product) => !product.isDeleted),
          ),
        );
      },
    );
  }

  private getAllProductsFromApi(
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    return this.getAllPages(
      (page) =>
        this.http.get<ApiProductsListResponse>(
          buildProductsListUrl(this.pageLimit, page),
        ),
      options,
    );
  }

  private getAllSubcategoryProductsFromApi(
    subcategoryId: string,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    return this.getAllPages(
      (page) =>
        this.http.get<ApiProductsListResponse>(
          buildProductsBySubcategoryUrl(subcategoryId, this.pageLimit, page),
        ),
      options,
    );
  }

  private getAllCategoryProductsFromApi(
    categoryId: string,
    options?: ExtractProductsOptions,
  ): Observable<ApiProductRecord[]> {
    return this.getAllPages(
      (page) =>
        this.http.get<ApiProductsListResponse>(
          buildProductsByCategoryUrl(categoryId, this.pageLimit, page),
        ),
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

        const remainingRequests = Array.from(
          { length: totalPages - 1 },
          (_, index) => requestPage(index + 2),
        );

        return forkJoin(remainingRequests).pipe(
          map((responses) =>
            this.mergeProducts([
              firstPageProducts,
              ...responses.map((response) =>
                extractProducts(response, options),
              ),
            ]),
          ),
        );
      }),
    );
  }

  // private getTotalPages(response: ApiProductsListResponse): number {
  //   const pages = response.pagination?.pages ?? response.pages;

  //   if (typeof pages === 'number' && pages > 0) {
  //     return pages;
  //   }

  //   const total = response.pagination?.total ?? response.total;
  //   const limit = response.pagination?.limit ?? response.limit;

  //   if (typeof total === 'number' && typeof limit === 'number' && limit > 0) {
  //     return Math.ceil(total / limit);
  //   }

  //   return 1;
  // }
  private getTotalPages(response: ApiProductsListResponse): number {
    return Math.ceil(response.total / response.limit);
  }
  private mergeProducts(
    productPages: ApiProductRecord[][],
  ): ApiProductRecord[] {
    const seenIds = new Set<string>();

    return productPages.flat().filter((product) => {
      const id = product._id ?? "";

      if (!id || seenIds.has(id)) {
        return false;
      }

      seenIds.add(id);
      return true;
    });
  }

  private getOrCreateCachedRequest(
    cache: Map<string, Observable<ApiProductRecord[]>>,
    cacheKey: string,
    createRequest: () => Observable<ApiProductRecord[]>,
  ): Observable<ApiProductRecord[]> {
    const cached = cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const request$ = createRequest().pipe(
      catchError((error) => {
        cache.delete(cacheKey);
        return throwError(() => error);
      }),
      shareReplay(1),
    );

    cache.set(cacheKey, request$);
    return request$;
  }
}

// Component
//    │
//    ▼
// ProductCollectionsService
//    │
//    ├── getAllProducts()
//    │
//    ├── getProductsByCategoryId()
//    │
//    └── getProductsBySubcategoryId()
//             │
//             ▼
//         Cache Check
//             │
//        ┌────┴────┐
//        │         │
//     Cached    Not Cached
//        │         │
//        │         ▼
//        │      API Request
//        │         │
//        │         ▼
//        │    Pagination
//        │         │
//        │    ┌────┴────┐
//        │    │         │
//        │   Page 1   Pages 2+
//        │              │
//        │          forkJoin
//        │              │
//        │              ▼
//        │       mergeProducts
//        │              │
//        └──────────────┘
//               │
//               ▼
//         Products Array
