import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { ApiProductRecord, getProductId, getProductOriginalPrice, getProductQuantity, getPrimaryImageUrl } from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';

interface FragranceApiRecord extends ApiProductRecord {
  title?: string;
  badge?: string;
  detail?: string;
}

export interface FragranceProduct {
  id: string;
  title: string;
  badge: string;
  name: string;
  detail: string;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
}

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
