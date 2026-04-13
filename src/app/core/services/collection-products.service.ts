import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  ApiProductRecord,
  CollectionQuery,
  getCoverImageUrl,
  getCornerImageUrl,
  getHoverImageUrl,
  getProductId,
  getProductOriginalPrice,
  getProductQuantity,
  getPrimaryImageUrl,
} from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';

interface CollectionProductApiRecord extends ApiProductRecord {
  originalPrice?: number;
}

export interface CollectionProductOptions {
  includeDeleted?: boolean;
  fetchAllPages?: boolean;
}

export interface CollectionProductSeed {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  quantity?: number;
  primaryImage?: string;
  hoverImage?: string;
  coverImage?: string;
  cornerImage?: string;
}

export interface CollectionProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  isDeleted: boolean;
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
export class CollectionProductsService {
  private readonly productCollectionsService = inject(ProductCollectionsService);

  getProductsByQuery(query?: CollectionQuery, options?: CollectionProductOptions): Observable<CollectionProduct[]> {
    return this.productCollectionsService.getProductsByQuery(query, options).pipe(
      map((products) => products.map((product) => this.toCollectionProduct(product, options))),
    );
  }

  getProductsBySubcategoryId(
    subcategoryId: string,
    fetchAllPages = false,
    options?: CollectionProductOptions,
  ): Observable<CollectionProduct[]> {
    return this.productCollectionsService.getProductsBySubcategoryId(subcategoryId, fetchAllPages, options).pipe(
      map((products) => products.map((product) => this.toCollectionProduct(product, options))),
    );
  }

  getCollectionProducts(folderName: string): Observable<CollectionProduct[]> {
    return this.getCollectionProductsWithOptions(folderName);
  }

  getCollectionProductsWithOptions(folderName: string, options?: CollectionProductOptions): Observable<CollectionProduct[]> {
    const folder = folderName.replace(/^\/|\/$/g, '');
    const query = COLLECTION_FOLDER_QUERIES[folder];

    return this.getProductsByQuery(query, options);
  }

  createCollectionProducts(_folderName: string, products: CollectionProductSeed[], imageFiles: string[]): CollectionProduct[] {
    return products.map((product, index) => {
      const fallbackImage = imageFiles[index % imageFiles.length] ?? '';
      const primaryImage = product.primaryImage ?? fallbackImage;
      const coverImage = product.coverImage;
      const hoverImage = product.hoverImage ?? coverImage ?? primaryImage;

      return this.toCollectionProduct(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          stock: product.quantity ?? 1,
          images: [primaryImage, hoverImage].filter(Boolean),
          isDeleted: false,
        },
      );
    });
  }

  private toCollectionProduct(product: CollectionProductApiRecord, options?: CollectionProductOptions): CollectionProduct {
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
      originalPrice: product.originalPrice ?? getProductOriginalPrice(product),
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
}

const COLLECTION_FOLDER_QUERIES: Record<string, CollectionQuery> = {
  care: { categoryName: 'Care Products', subcategoryName: 'care' },
  fragrances: { categoryName: 'Perfumes' },
  'The-Art-Dedication': { categoryName: 'Perfumes', subcategoryName: 'art-of-detecation-perfumes' },
  'category-topaco': { categoryName: 'Perfumes', subcategoryName: 'topacco collection' },
  'Arrogate-collection': { categoryName: 'Perfumes', subcategoryName: 'Arrogate' },
  'category-frankel': { categoryName: 'Perfumes', subcategoryName: 'Frankel' },
  'pink-collection': { categoryName: 'Perfumes', subcategoryName: 'pink-collection' },
  'promise-bags': { categoryName: 'Assaf Bags', subcategoryName: 'promise bag' },
  'women-bags': { categoryName: 'Assaf Bags', subcategoryName: 'women' },
  'children-bags': { categoryName: 'Assaf Bags', subcategoryName: 'children' },
  'classic-watches': { categoryName: 'Assaf Watches', subcategoryName: 'classic watches' },
  'sport-watches': { categoryName: 'Assaf Watches', subcategoryName: 'sports Watches' },
  'sports-watches': { categoryName: 'Assaf Watches', subcategoryName: 'sports Watches' },
  'women-watches': { categoryName: 'Assaf Watches', subcategoryName: "women's watches" },
  'wild-colt-collection': { categoryName: 'Perfumes', subcategoryName: 'wild-colt-collection' },
  'private-collection': { categoryName: 'Perfumes', subcategoryName: 'Private Collection' },
  'summer-collection': { categoryName: 'Perfumes', subcategoryName: 'Summer collection' },
  'Gift-of-Nobles': { categoryName: 'Perfumes', subcategoryName: 'Gift of Nobles' },
  ' Lady-Collection': { categoryName: 'Perfumes', subcategoryName: 'lady collection' },
  ' Enable-Collection': { categoryName: 'Perfumes', subcategoryName: 'Enable Collection' },
  Pheromone: { categoryName: 'Perfumes', subcategoryName: 'Pheromone' },
  'Niche-Group': { categoryName: 'Perfumes', subcategoryName: 'Niche-Group' },
  'Morning-Collection': { categoryName: 'Perfumes', subcategoryName: 'morning collection' },
  Tobacco: { categoryName: 'Perfumes', subcategoryName: 'Topacco collection' },
  'high-constdiration-collection': { categoryName: 'Perfumes', subcategoryName: 'High constdiration collection' },
  'new-collection': { categoryName: 'Perfumes', subcategoryName: 'new collection' },
  'special-offers': { categoryName: 'Perfumes', subcategoryName: 'Special Offers' },
  'perfumers-choices': { categoryName: 'Perfumes', subcategoryName: "Perfumers'-Choices" },
  'the-new-covenant-2026': { categoryName: 'Perfumes', subcategoryName: 'The New Covenant-2026' },
  'winter-collection': { categoryName: 'Perfumes', subcategoryName: 'winter-collection' },
  'Perfumes-200ml-150ml': { categoryName: 'Perfumes', subcategoryName: 'Perfumes-200ml-150ml' },
  'pegasus-collection': { categoryName: 'Perfumes', subcategoryName: 'pegasus collection' },
  'category-bekasos': { categoryName: 'Perfumes', subcategoryName: 'pegasus collection' },
  'Dokhur-collection': { categoryName: 'Perfumes', subcategoryName: 'Dokhur collection' },
  'Assaf-discount': { categoryName: 'Assaf Discounts', subcategoryName: 'Assaf Discouns' },
};
