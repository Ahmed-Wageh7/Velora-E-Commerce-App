import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { getProductId, getProductOriginalPrice, getProductQuantity, getPrimaryImageUrl } from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';
import { FragranceApiRecord, FragranceProduct } from '../../models/product/home-product.model';

@Injectable({
  providedIn: 'root',
})
export class FragrancesService {
  private readonly productCollectionsService = inject(ProductCollectionsService);
  private readonly fragrances$ = this.productCollectionsService
    .getProductsByQuery({ categoryName: 'Perfumes' })
    .pipe(
      map((products) => products.map((product) => this.toFragranceProduct(product))),
      shareReplay(1),
    );

  getFragrances(): Observable<FragranceProduct[]> {
    return this.fragrances$;
  }

  private toFragranceProduct(product: FragranceApiRecord): FragranceProduct {
    return {
      id: getProductId(product),
      title: product.title ?? product.name,
      badge: product.badge ?? '',
      name: product.name,
      detail: product.detail ?? '',
      price: product.price,
      originalPrice: getProductOriginalPrice(product),
      quantity: getProductQuantity(product),
      imageUrl: getPrimaryImageUrl(product),
    };
  }
}
