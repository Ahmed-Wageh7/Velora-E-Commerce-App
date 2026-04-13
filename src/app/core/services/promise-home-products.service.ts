import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiProductRecord, getProductId, getProductOriginalPrice, getProductQuantity, getPrimaryImageUrl } from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';

interface PromiseHomeProductApiRecord extends ApiProductRecord {
  title?: string;
  badge?: string;
  detail?: string;
}

export interface PromiseHomeProduct {
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
export class PromiseHomeProductsService {
  private readonly productCollectionsService = inject(ProductCollectionsService);

  getProducts(): Observable<PromiseHomeProduct[]> {
    return this.productCollectionsService
      .getProductsByQuery({ categoryName: 'Assaf Bags', subcategoryName: 'promise bag' })
      .pipe(map((products) => products.map((product) => this.toProduct(product))));
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
