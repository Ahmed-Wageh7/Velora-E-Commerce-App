import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';
import { getProductId, getProductOriginalPrice, getProductQuantity, getPrimaryImageUrl } from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';
import { TaxonomyService } from './taxonomy.service';
import { FragranceApiRecord, FragranceProduct } from '../../models/product/home-product.model';

@Injectable({
  providedIn: 'root',
})
export class FragrancesService {
  private readonly productCollectionsService = inject(ProductCollectionsService);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly fragrances$ = this.taxonomyService
    .findCategoryBySlug('perfumes')
    .pipe(
      switchMap((category) => {
        const categoryId = category?._id ?? category?.id ?? '';

        return categoryId
          ? this.productCollectionsService.getProductsByCategoryId(categoryId)
          : of([]);
      }),
    )
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
