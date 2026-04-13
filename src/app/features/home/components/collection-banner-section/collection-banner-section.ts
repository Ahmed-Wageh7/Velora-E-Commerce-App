import { ChangeDetectorRef, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { CartAnimationService } from '../../../../core/services/cart-animation.service';
import { CartService } from '../../../../core/services/cart.service';
import {
  CollectionProduct,
  CollectionProductsService,
} from '../../../../core/services/collection-products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { toRequestState } from '../../../../core/utils/request-state';

@Component({
  selector: 'app-collection-banner-section',
  imports: [RouterLink],
  templateUrl: './collection-banner-section.html',
  styleUrl: './collection-banner-section.scss',
})
export class CollectionBannerSectionComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly loadingProductIds = new Set<string>();

  readonly bannerImage = input.required<string>();
  readonly bannerAlt = input.required<string>();
  readonly bannerRoute = input<string | null>(null);
  readonly title = input<string | null>(null);
  readonly subcategoryId = input<string | null>(null);
  readonly collectionFolder = input<string | null>(null);
  readonly detailsFolder = input.required<string>();
  readonly productLimit = input(4);
  readonly skipProducts = input(0);
  readonly includeDeletedProducts = input(true);
  readonly fetchAllPages = input(true);
  readonly uniformImageFill = input(false);

  protected readonly productsState = toSignal(
    toObservable(
      computed(() => ({
        subcategoryId: this.subcategoryId(),
        collectionFolder: this.collectionFolder(),
        includeDeletedProducts: this.includeDeletedProducts(),
        fetchAllPages: this.fetchAllPages(),
      })),
    ).pipe(
      switchMap(({ subcategoryId, collectionFolder, includeDeletedProducts, fetchAllPages }) =>
        toRequestState(this.getProductsSource(subcategoryId, collectionFolder, includeDeletedProducts, fetchAllPages), {
          initialData: [] as CollectionProduct[],
          loadingMessage: 'Loading products...',
          emptyMessage: 'No products are available right now.',
          errorMessage: 'We could not load this collection right now.',
        }),
      ),
    ),
    {
      initialValue: {
        status: 'loading' as const,
        data: [] as CollectionProduct[],
        message: 'Loading products...',
      },
    },
  );

  protected readonly visibleProducts = computed(() => {
    const start = this.skipProducts();
    return this.productsState().data.slice(start, start + this.productLimit());
  });

  protected trackById(_: number, product: CollectionProduct): string {
    return `${product.id}`;
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getButtonLabel(product: CollectionProduct): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
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
        description: `${product.name} ${this.getSectionLabel().toLowerCase()} product`,
        image: product.primaryImageUrl,
        detailFolder: this.detailsFolder(),
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

  protected hasTitle(): boolean {
    return !!this.title()?.trim();
  }

  private getProductsSource(
    subcategoryId: string | null,
    collectionFolder: string | null,
    includeDeletedProducts: boolean,
    fetchAllPages: boolean,
  ) {
    if (collectionFolder?.trim()) {
      return this.collectionProductsService.getCollectionProductsWithOptions(collectionFolder, {
        includeDeleted: includeDeletedProducts,
        fetchAllPages,
      });
    }

    if (subcategoryId?.trim()) {
      return this.collectionProductsService.getProductsBySubcategoryId(subcategoryId, fetchAllPages, {
        includeDeleted: includeDeletedProducts,
      });
    }

    return this.collectionProductsService.getProductsByQuery(undefined, {
      includeDeleted: includeDeletedProducts,
      fetchAllPages,
    });
  }

  private getSectionLabel(): string {
    return this.title()?.trim() || 'collection';
  }

  private waitForButtonFeedback(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 240));
  }
}
