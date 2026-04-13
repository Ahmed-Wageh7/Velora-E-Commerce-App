import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  ApiProductRecord,
  getCoverImageUrl,
  getHoverImageUrl,
  getProductId,
  getProductOriginalPrice,
  getProductQuantity,
  getPrimaryImageUrl,
} from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';

interface ArtDedicationApiRecord extends ApiProductRecord {
  subtitle?: string;
}

export interface ArtDedicationProduct {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
  coverImageUrl?: string;
  hoverImageAlt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ArtDedicationService {
  private readonly productCollectionsService = inject(ProductCollectionsService);
  private readonly homeSubcategoryId = '69d4fe2b9e39253830600a75';

  getArtDedicationProducts(): Observable<ArtDedicationProduct[]> {
    return this.productCollectionsService
      .getProductsBySubcategoryId(this.homeSubcategoryId, true, { includeDeleted: true })
      .pipe(map((products) => products.map((product) => this.toArtDedicationProduct(product))));
  }

  private toArtDedicationProduct(product: ArtDedicationApiRecord): ArtDedicationProduct {
    return {
      id: getProductId(product),
      name: product.name,
      subtitle: product.subtitle ?? '',
      price: product.price,
      originalPrice: getProductOriginalPrice(product),
      quantity: getProductQuantity(product),
      imageUrl: getPrimaryImageUrl(product),
      coverImageUrl: getCoverImageUrl(product),
      hoverImageAlt: `${product.name} detail view`,
    };
  }
}
