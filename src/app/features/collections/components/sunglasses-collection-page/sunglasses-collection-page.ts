import { AsyncPipe } from '@angular/common';
import { ChangeDetectorRef, Component, computed, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { delay, switchMap } from 'rxjs';
import { CartAnimationService } from '../../../../core/services/cart-animation.service';
import { CartService } from '../../../../core/services/cart.service';
import {
  CollectionProduct,
  CollectionProductsService,
} from '../../../../core/services/collection-products.service';
import { CollectionQuery } from '../../../../core/services/product-api.utils';
import { ToastService } from '../../../../core/services/toast.service';
import { SiteNavbar } from '../../../../shared/components/site-navbar/site-navbar';

@Component({
  selector: 'app-sunglasses-collection-page',
  imports: [AsyncPipe, RouterLink, SiteNavbar],
  templateUrl: './sunglasses-collection-page.html',
  styleUrl: '../../pages/frankel-collection/frankel-collection.scss',
})
export class SunglassesCollectionPageComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 12;
  private readonly loadingProductIds = new Set<string>();

  readonly pageTitle = input.required<string>();
  readonly breadcrumbLabel = input.required<string>();
  readonly breadcrumbParentLabel = input('Veloura Sunglasses');
  readonly collectionFolder = input.required<string>();
  readonly descriptionLabel = input.required<string>();
  readonly heroImageFile = input.required<string>();
  readonly categoryName = input.required<string>();
  readonly subcategoryName = input.required<string>();
  readonly subcategoryId = input<string>();
  readonly fetchAllSubcategoryPages = input(false);
  readonly includeDeletedProducts = input(false);
  readonly minimumLoadingMs = input(0);
  readonly useCareShimmer = input(false);
  readonly hideHero = input(false);
  readonly heroFullWidth = input(false);

  protected isShowingMore = false;
  protected readonly sortOptions = ['Our Suggestions', 'Newest', 'Price: Low to High', 'Price: High to Low'];
  protected selectedSort = this.sortOptions[0];
  protected visibleCount = this.pageSize;
  protected readonly heroImageUrl = computed(() => {
    const heroImageFile = this.heroImageFile();

    return heroImageFile.startsWith('/') ? heroImageFile : `/${this.collectionFolder()}/${heroImageFile}`;
  });
  protected readonly products$ = toObservable(
    computed(
      () => ({
        subcategoryId: this.subcategoryId(),
        fetchAllSubcategoryPages: this.fetchAllSubcategoryPages(),
        includeDeletedProducts: this.includeDeletedProducts(),
        minimumLoadingMs: this.minimumLoadingMs(),
        query: {
          categoryName: this.categoryName(),
          subcategoryName: this.subcategoryName(),
        } satisfies CollectionQuery,
      }),
    ),
  ).pipe(
    switchMap(({ subcategoryId, fetchAllSubcategoryPages, includeDeletedProducts, minimumLoadingMs, query }) =>
      (subcategoryId
        ? this.collectionProductsService.getProductsBySubcategoryId(subcategoryId, fetchAllSubcategoryPages, {
            includeDeleted: includeDeletedProducts,
          })
        : this.collectionProductsService.getProductsByQuery(query)
      ).pipe(delay(minimumLoadingMs)),
    ),
  );

  protected trackById(_: number, product: CollectionProduct): string {
    return String(product.id);
  }

  protected getButtonLabel(product: CollectionProduct): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getVisibleProducts(products: CollectionProduct[]): CollectionProduct[] {
    return this.getSortedProducts(products).slice(0, this.visibleCount);
  }

  protected canShowMore(products: CollectionProduct[]): boolean {
    return this.visibleCount < this.getSortedProducts(products).length;
  }

  protected showMore(): void {
    if (this.isShowingMore) {
      return;
    }

    this.isShowingMore = true;
    this.changeDetectorRef.detectChanges();

    window.setTimeout(() => {
      this.visibleCount += this.pageSize;
      this.isShowingMore = false;
      this.changeDetectorRef.detectChanges();
    }, 240);
  }

  protected updateSort(value: string): void {
    this.selectedSort = value;
    this.visibleCount = this.pageSize;
  }

  protected async addToCart(product: CollectionProduct, event: MouseEvent): Promise<void> {
    if (product.quantity <= 0) {
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    this.loadingProductIds.add(product.id);
    this.changeDetectorRef.detectChanges();

    try {
      const added = await this.cartService.addToCartWithApi({
        id: product.id,
        name: product.name,
        price: product.price,
        description: `${product.name} ${this.descriptionLabel()}`,
        image: product.primaryImageUrl,
        detailFolder: this.collectionFolder(),
      });

      if (!added) {
        return;
      }

      await Promise.all([
        this.waitForButtonFeedback(),
        this.cartAnimationService.animateFromTrigger(trigger, product.primaryImageUrl),
      ]);
      this.toastService.showAddedToCart({
        name: product.name,
        image: product.primaryImageUrl,
        price: product.price,
        quantity: 1,
      });
    } finally {
      this.loadingProductIds.delete(product.id);
      this.changeDetectorRef.detectChanges();
    }
  }

  private getSortedProducts(products: CollectionProduct[]): CollectionProduct[] {
    const sortedProducts = [...products];

    switch (this.selectedSort) {
      case 'Newest':
        return sortedProducts.sort((left, right) => right.id.localeCompare(left.id));
      case 'Price: Low to High':
        return sortedProducts.sort((left, right) => left.price - right.price);
      case 'Price: High to Low':
        return sortedProducts.sort((left, right) => right.price - left.price);
      default:
        return sortedProducts.sort((left, right) => left.id.localeCompare(right.id));
    }
  }

  private waitForButtonFeedback(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 240));
  }
}
