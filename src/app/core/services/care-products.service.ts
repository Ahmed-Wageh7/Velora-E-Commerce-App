import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  ApiProductRecord,
  getCoverImageUrl,
  getCornerImageUrl,
  getHoverImageUrl,
  getProductId,
  getProductOriginalPrice,
  getProductQuantity,
  getPrimaryImageUrl,
} from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';

interface CareProductApiRecord extends ApiProductRecord {}

export interface CareProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  primaryImageUrl: string;
  hoverImageUrl: string;
  primaryImageAlt: string;
  hoverImageAlt: string;
  coverImageUrl?: string;
  cornerImageUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CareProductsService {
  private readonly productCollectionsService = inject(ProductCollectionsService);
  private readonly careSubcategoryId = '69d534779e39253830600cc2';

  getCareProducts(): Observable<CareProduct[]> {
    return this.productCollectionsService
      .getProductsBySubcategoryId(this.careSubcategoryId, true, { includeDeleted: true })
      .pipe(map((products) => products.map((product) => this.toCareProduct(product))));
  }

  private toCareProduct(product: CareProductApiRecord): CareProduct {
    const quantity = product.isDeleted ? 0 : getProductQuantity(product);

    return {
      id: getProductId(product),
      name: product.name,
      price: product.price,
      originalPrice: getProductOriginalPrice(product),
      quantity,
      primaryImageUrl: getPrimaryImageUrl(product),
      hoverImageUrl: getHoverImageUrl(product),
      primaryImageAlt: product.name,
      hoverImageAlt: `${product.name} detail view`,
      coverImageUrl: getCoverImageUrl(product),
      cornerImageUrl: getCornerImageUrl(product),
    };
  }
}
