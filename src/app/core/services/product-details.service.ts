import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import {
  ApiCategoryRef,
  ApiProductRecord,
  ApiResponseEnvelope,
  buildProductByIdUrl,
  extractApiData,
  getCoverImageUrl,
  getCornerImageUrl,
  getGalleryImageUrls,
  getHoverImageUrl,
  getPrimaryImageUrl,
  getProductId,
  getProductOriginalPrice,
  getProductQuantity,
} from './product-api.utils';
import { ProductCollectionsService } from './product-collections.service';

interface ProductDetailsApiSection {
  title?: string;
  heading?: string;
  body?: string | string[];
  content?: string | string[];
}

interface ProductDetailsApiRecord extends ApiProductRecord {
  title?: string;
  subtitle?: string;
  badge?: string;
  detail?: string;
  sku?: string;
  size?: string | number | null;
  productType?: string;
  status?: string;
  rating?: number;
  reviewsCount?: number;
  reviewCount?: number;
  sections?: ProductDetailsApiSection[];
}

interface ProductDetailsApiResponse extends ApiResponseEnvelope<ProductDetailsApiRecord> {
  product?: ProductDetailsApiRecord | null;
}

export interface ProductDetailsSection {
  title: string;
  lines: string[];
}

export interface RelatedProductSummary {
  id: string;
  folder: string;
  name: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
}

export interface ProductDetails {
  id: string;
  folder: string;
  name: string;
  title: string;
  subtitle: string;
  badge: string;
  detail: string;
  description: string;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
  hoverImageUrl: string;
  galleryImageUrls: string[];
  coverImageUrl?: string;
  cornerImageUrl?: string;
  sku: string;
  size: string;
  productType: string;
  status: string;
  rating: number;
  reviewsCount: number;
  sections: ProductDetailsSection[];
  relatedProducts: RelatedProductSummary[];
}

@Injectable({
  providedIn: 'root',
})
export class ProductDetailsService {
  private readonly http = inject(HttpClient);
  private readonly productCollectionsService = inject(ProductCollectionsService);

  getProductDetails(folder: string, id: string): Observable<ProductDetails | null> {
    const normalizedFolder = folder.replace(/^\/|\/$/g, '');

    return this.http.get<ProductDetailsApiResponse | ProductDetailsApiRecord>(buildProductByIdUrl(id)).pipe(
      map((response) => this.extractProductRecord(response)),
      switchMap((product) => {
        if (!product) {
          return of(null);
        }

        return this.getRelatedProducts(product).pipe(
          map((relatedProducts) => this.toProductDetails(normalizedFolder, product, relatedProducts)),
        );
      }),
    );
  }

  private toProductDetails(
    folder: string,
    product: ProductDetailsApiRecord,
    relatedProducts: RelatedProductSummary[],
  ): ProductDetails {
    const sections = this.toSections(folder, product);
    const productId = getProductId(product);
    const description = this.cleanText(product.description);
    const subtitle = this.cleanText(product.subtitle);
    const detail = this.cleanText(product.detail);
    const detailText = detail ?? subtitle ?? '';
    const size = product.size != null ? String(product.size) : this.inferSize(product);
    const productType = product.productType ?? this.inferProductType(folder);
    const quantity = product.isDeleted ? 0 : getProductQuantity(product);

    return {
      id: productId,
      folder,
      name: product.name ?? 'Product',
      title: product.title ?? product.name ?? 'Product',
      subtitle: subtitle ?? '',
      badge: product.badge ?? '',
      detail: detailText,
      description: description ?? detailText,
      price: product.price,
      originalPrice: getProductOriginalPrice(product),
      quantity,
      imageUrl: getPrimaryImageUrl(product),
      hoverImageUrl: getHoverImageUrl(product),
      galleryImageUrls: getGalleryImageUrls(product),
      coverImageUrl: getCoverImageUrl(product),
      cornerImageUrl: getCornerImageUrl(product),
      sku: product.sku ?? `${folder}-${productId}`,
      size,
      productType,
      status: quantity > 0 ? 'In Stock' : 'Out of Stock',
      rating: product.rating ?? 5,
      reviewsCount: product.reviewsCount ?? product.reviewCount ?? 0,
      sections,
      relatedProducts,
    };
  }

  private toSections(folder: string, product: ProductDetailsApiRecord): ProductDetailsSection[] {
    if (product.sections?.length) {
      return product.sections
        .map((section) => {
          const lines = this.normalizeLines(section.body ?? section.content);

          if (!lines.length) {
            return null;
          }

          return {
            title: section.title ?? section.heading ?? 'Product details',
            lines,
          };
        })
        .filter((section): section is ProductDetailsSection => section !== null);
    }

    const fallbackSections: ProductDetailsSection[] = [];

    if (product.detail || product.subtitle) {
      fallbackSections.push({
        title: 'Product details',
        lines: this.normalizeLines(
          [product.detail, product.subtitle].filter((line): line is string => Boolean(line)),
        ),
      });
    }

    fallbackSections.push({
      title: 'Details',
      lines: [
        `Size: ${this.inferSize(product)}`,
        `Product type: ${product.productType ?? this.inferProductType(folder)}`,
      ],
    });

    return fallbackSections.filter((section) => section.lines.length > 0);
  }

  private normalizeLines(value: string | string[] | undefined): string[] {
    if (!value) {
      return [];
    }

    return (Array.isArray(value) ? value : [value])
      .map((line) => this.cleanText(line))
      .filter((line): line is string => Boolean(line));
  }

  private inferSize(product: ProductDetailsApiRecord): string {
    return this.cleanText(product.detail) || this.cleanText(product.subtitle) || 'Standard size';
  }

  private inferProductType(folder: string): string {
    const normalizedFolder = folder.toLowerCase();

    if (normalizedFolder.includes('watch')) {
      return 'Watch';
    }

    if (normalizedFolder.includes('bag')) {
      return 'Bag';
    }

    if (normalizedFolder.includes('glass')) {
      return 'Sunglasses';
    }

    if (normalizedFolder.includes('care')) {
      return 'Care product';
    }

    return 'Perfume';
  }

  private extractProductRecord(
    response: ProductDetailsApiResponse | ProductDetailsApiRecord,
  ): ProductDetailsApiRecord | null {
    if (response && typeof response === 'object' && 'product' in response) {
      return response.product ?? null;
    }

    const data = extractApiData<ProductDetailsApiRecord | { product?: ProductDetailsApiRecord | null } | null | undefined>(
      response as ProductDetailsApiResponse,
    );

    if (data && typeof data === 'object' && 'product' in data) {
      return data.product ?? null;
    }

    return data && typeof data === 'object' ? (data as ProductDetailsApiRecord) : null;
  }

  private getRelatedProducts(product: ProductDetailsApiRecord): Observable<RelatedProductSummary[]> {
    const currentProductId = getProductId(product);
    const subcategoryId = this.getRefId(product.subcategory);

    if (subcategoryId) {
      return this.productCollectionsService.getProductsBySubcategoryId(subcategoryId, true).pipe(
        map((products) =>
          products
            .filter((item) => getProductId(item) !== currentProductId)
            .slice(0, 8)
            .map((item) => this.toRelatedProductSummary(item)),
        ),
      );
    }

    const categoryId = this.getRefId(product.category);

    if (categoryId) {
      return this.productCollectionsService.getProductsByCategoryId(categoryId).pipe(
        map((products) =>
          products
            .filter((item) => getProductId(item) !== currentProductId)
            .slice(0, 8)
            .map((item) => this.toRelatedProductSummary(item)),
        ),
      );
    }

    return of([]);
  }

  private toRelatedProductSummary(product: ApiProductRecord): RelatedProductSummary {
    return {
      id: getProductId(product),
      folder: this.inferFolderFromProduct(product),
      name: product.name,
      price: product.price,
      originalPrice: getProductOriginalPrice(product),
      imageUrl: getPrimaryImageUrl(product),
    };
  }

  private getRefId(value: string | ApiCategoryRef | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value._id ?? value.id ?? null;
  }

  private inferFolderFromProduct(product: ApiProductRecord): string {
    const categoryName = this.getRefName(product.category).toLowerCase();
    const subcategoryName = this.getRefName(product.subcategory).toLowerCase();

    if (categoryName.includes('sunglasses')) {
      if (subcategoryName.includes('women')) {
        return 'women-sunglasses';
      }

      if (subcategoryName.includes('men')) {
        return 'men-sunglasses';
      }
    }

    if (categoryName.includes('bags')) {
      if (subcategoryName.includes('promise')) {
        return 'promise-bags';
      }

      if (subcategoryName.includes('women')) {
        return 'women-bags';
      }

      if (subcategoryName.includes('children')) {
        return 'children-bags';
      }
    }

    if (categoryName.includes('watches')) {
      if (subcategoryName.includes('women')) {
        return 'women-watches';
      }

      if (subcategoryName.includes('sport')) {
        return 'sports-watches';
      }

      if (subcategoryName.includes('classic')) {
        return 'classic-watches';
      }
    }

    if (categoryName.includes('care')) {
      return 'care';
    }

    return 'catalog';
  }

  private getRefName(value: string | ApiCategoryRef | null | undefined): string {
    if (!value || typeof value === 'string') {
      return '';
    }

    return value.name ?? '';
  }

  private cleanText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();

    if (!normalized || normalized === '""' || normalized === "''") {
      return null;
    }

    return normalized;
  }
}
