import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, throwError } from 'rxjs';
import {
  getCoverImageUrl,
  getCornerImageUrl,
  getHoverImageUrl,
  getProductId,
  getProductOriginalPrice,
  getProductQuantity,
  getPrimaryImageUrl,
} from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';
import { ApiProductRecord } from '../../models/product/product-api.model';
import { ProductListItem, ProductListOptions } from '../../models/product/product-list-item.model';

@Injectable({
  providedIn: 'root',
})
export class ProductListingService {
  private readonly productCollectionsService = inject(ProductCollectionsService);
  private readonly cache = new Map<string, Observable<ProductListItem[]>>();

  getProductsBySubcategory(subcategoryId: string, options?: ProductListOptions): Observable<ProductListItem[]> {
    const normalizedId = subcategoryId.trim();

    if (!normalizedId) {
      return of([]);
    }

    const cacheKey = JSON.stringify({ resource: 'subcategory', id: normalizedId, options });

    return this.getOrCreateCachedRequest(cacheKey, () =>
      this.productCollectionsService.getProductsBySubcategoryId(normalizedId, options?.fetchAllPages, {
        includeDeleted: options?.includeDeleted,
      }).pipe(map((products) => products.map((product) => this.toProductListItem(product, options)))),
    );
  }

  getProductsByCategory(categoryId: string, options?: ProductListOptions): Observable<ProductListItem[]> {
    const normalizedId = categoryId.trim();

    if (!normalizedId) {
      return of([]);
    }

    const cacheKey = JSON.stringify({ resource: 'category', id: normalizedId, options });

    return this.getOrCreateCachedRequest(cacheKey, () =>
      this.productCollectionsService.getProductsByCategoryId(normalizedId, options?.fetchAllPages, {
        includeDeleted: options?.includeDeleted,
      }).pipe(map((products) => products.map((product) => this.toProductListItem(product, options)))),
    );
  }

  toProductListItem(product: ApiProductRecord, options?: ProductListOptions): ProductListItem {
    const primaryImageUrl = getPrimaryImageUrl(product);
    const coverImageUrl = getCoverImageUrl(product);
    const hoverImageUrl = getHoverImageUrl(product);
    const cornerImageUrl = getCornerImageUrl(product);
    const isDeleted = !!product.isDeleted;
    const shouldTreatDeletedAsOutOfStock = options?.includeDeleted && isDeleted;

    return {
      id: getProductId(product),
      name: product.name,
      price: product.price,
      originalPrice: getProductOriginalPrice(product),
      quantity: shouldTreatDeletedAsOutOfStock ? 0 : getProductQuantity(product),
      isDeleted,
      primaryImageUrl,
      hoverImageUrl,
      primaryImageAlt: product.name,
      hoverImageAlt: `${product.name} detail view`,
      coverImageUrl,
      cornerImageUrl,
    };
  }

  private getOrCreateCachedRequest(
    cacheKey: string,
    createRequest: () => Observable<ProductListItem[]>,
  ): Observable<ProductListItem[]> {
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const request$ = createRequest().pipe(
      catchError((error) => {
        this.cache.delete(cacheKey);
        return throwError(() => error);
      }),
      shareReplay(1),
    );

    this.cache.set(cacheKey, request$);
    return request$;
  }
}
