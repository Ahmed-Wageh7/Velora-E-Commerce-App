import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay } from 'rxjs';
import {
  ApiImageValue,
  ApiProductsListResponse,
  buildProductsListUrl,
  extractProducts,
  getCoverImageUrl,
  getCornerImageUrl,
  getProductId,
  getProductOriginalPrice,
  getProductQuantity,
  getPrimaryImageUrl,
} from './product-api.utils';

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

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly remoteProductsUrl = buildProductsListUrl();
  private readonly localProductsUrl = 'assets/products.json';

  private readonly products$ = this.http.get<ApiProductsListResponse>(this.remoteProductsUrl).pipe(
    map((response) => extractProducts(response).map((product) => this.toProduct(product as Product))),
    catchError(() => this.http.get<Product[]>(this.localProductsUrl).pipe(map((products) => products.map((product) => this.toProduct(product))))),
    shareReplay(1),
  );

  getProducts(): Observable<Product[]> {
    return this.products$;
  }

  getProductById(id: string): Observable<Product | undefined> {
    return this.products$.pipe(map((products) => products.find((product) => product.id === id)));
  }

  private toProduct(product: Product): Product {
    const primaryImage = getPrimaryImageUrl(product);
    const coverImage = getCoverImageUrl(product);
    const cornerImage = getCornerImageUrl(product);

    return {
      ...product,
      id: getProductId(product),
      originalPrice: getProductOriginalPrice(product),
      quantity: getProductQuantity(product),
      image: primaryImage,
      primaryImage,
      coverImage,
      cornerImage,
    };
  }
}
