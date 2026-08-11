import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { getProductId, getProductOriginalPrice, getProductQuantity, getPrimaryImageUrl } from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';
import { PromiseHomeProduct, PromiseHomeProductApiRecord } from '../../models/product/home-product.model';

@Injectable({
  providedIn: 'root',
})
export class PromiseHomeProductsService {
  private readonly productCollectionsService = inject(ProductCollectionsService);
  private readonly promiseBagsSubcategoryId = '69d4fe299e39253830600a70';
  private readonly products$ = this.productCollectionsService
    .getProductsBySubcategoryId(this.promiseBagsSubcategoryId)
    .pipe(
      map((products) => products.map((product) => this.toProduct(product))),
      shareReplay(1),
    );

  getProducts(): Observable<PromiseHomeProduct[]> {
    return this.products$;
  }

  private toProduct(product: PromiseHomeProductApiRecord): PromiseHomeProduct {
    return {
      id: getProductId(product),
      title: product.title || product.name,
      badge: product.badge || '',
      name: product.name,
      detail: product.detail || '',
      price: product.price,
      originalPrice: getProductOriginalPrice(product),
      quantity: getProductQuantity(product),
      imageUrl: getPrimaryImageUrl(product),
    };
  }
}
