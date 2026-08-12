import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartAnimationService } from '../../../../core/cart/cart-animation.service';
import { CartService } from '../../../../core/cart/cart.service';
import { CareProductsService } from '../../../../core/api/care-products.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { SiteNavbar } from '../../../../layout/site-navbar/site-navbar';
import { toRequestState } from '../../../../core/utils/request-state';
import { CareProduct } from '../../../../models/product/home-product.model';
import { PRODUCT_SORT_OPTIONS, sortProducts, waitForButtonFeedback } from '../../components/shared/product-collection-ui';

@Component({
  selector: 'app-care-products-page',
  imports: [RouterLink, SiteNavbar],
  templateUrl: './care-products.html',
  styleUrl: './care-products.scss',
})
export class CareProductsPageComponent {
  private readonly careProductsService = inject(CareProductsService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 15;
  private readonly loadingProductIds = signal<ReadonlySet<string>>(new Set());
  protected readonly detailsFolder = 'care';
  protected readonly isShowingMore = signal(false);

  protected readonly sortOptions = PRODUCT_SORT_OPTIONS;
  protected readonly selectedSort = signal<string>(this.sortOptions[0]);
  protected readonly careProductsState = toSignal(
    toRequestState(this.careProductsService.getCareProducts(), {
      initialData: [] as CareProduct[],
      loadingMessage: 'Loading products...',
      emptyMessage: 'No care products are available yet.',
      errorMessage: 'We could not load care products right now.',
    }),
    {
      initialValue: {
        status: 'loading',
        data: [] as CareProduct[],
        message: 'Loading products...',
      },
    },
  );
  protected readonly visibleCount = signal(this.pageSize);
  protected readonly visibleProducts = computed(() =>
    sortProducts(this.careProductsState().data, this.selectedSort()).slice(0, this.visibleCount()),
  );
  protected readonly canShowMore = computed(() => this.visibleCount() < this.careProductsState().data.length);

  protected trackByName(_: number, product: CareProduct): string {
    return `${product.id}`;
  }

  protected getButtonLabel(product: CareProduct): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds().has(productId);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected async showMore(): Promise<void> {
    if (this.isShowingMore()) {
      return;
    }

    this.isShowingMore.set(true);
    await waitForButtonFeedback();
    this.visibleCount.update((count) => count + this.pageSize);
    this.isShowingMore.set(false);
  }

  protected updateSort(value: string): void {
    this.selectedSort.set(value);
    this.visibleCount.set(this.pageSize);
  }

  protected async addToCart(product: CareProduct, event: MouseEvent): Promise<void> {
    if (product.quantity <= 0) {
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    this.loadingProductIds.update((ids) => new Set(ids).add(product.id));

    try {
      const added = await this.cartService.addToCartWithApi({
        id: product.id,
        name: product.name,
        price: product.price,
        description: `${product.name} care product`,
        image: product.primaryImageUrl,
        detailFolder: this.detailsFolder,
      });

      if (!added) {
        return;
      }

      await Promise.all([
        waitForButtonFeedback(),
        this.cartAnimationService.animateFromTrigger(trigger, product.primaryImageUrl),
      ]);
      this.toastService.showAddedToCart({
        name: product.name,
        image: product.primaryImageUrl,
        price: product.price,
        quantity: 1,
      });
    } finally {
      this.loadingProductIds.update((ids) => {
        const nextIds = new Set(ids);
        nextIds.delete(product.id);
        return nextIds;
      });
    }
  }
}
