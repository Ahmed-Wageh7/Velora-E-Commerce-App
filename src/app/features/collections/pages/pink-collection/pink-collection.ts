import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { CartAnimationService } from '../../../../core/cart/cart-animation.service';
import { CartService } from '../../../../core/cart/cart.service';
import { ProductListingService } from '../../../../core/api/product-listing.service';
import { TaxonomyService } from '../../../../core/api/taxonomy.service';
import { ProductListItem } from '../../../../models/product/product-list-item.model';
import { ToastService } from '../../../../core/notifications/toast.service';
import { SiteNavbar } from '../../../../layout/site-navbar/site-navbar';
import { PRODUCT_SORT_OPTIONS, sortProducts, waitForButtonFeedback } from '../../components/shared/product-collection-ui';

@Component({
  selector: 'app-pink-collection-page',
  imports: [RouterLink, SiteNavbar],
  templateUrl: './pink-collection.html',
  styleUrl: './pink-collection.scss',
})
export class PinkCollectionPageComponent {
  private readonly productListingService = inject(ProductListingService);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 12;
  private readonly loadingProductIds = signal<ReadonlySet<string>>(new Set());
  protected readonly heroImageUrl = '/pink-collection/pink-head.webp';
  protected readonly promoImageUrl = '/collections/promos/pink-collection.webp';
  protected readonly isShowingMore = signal(false);

  protected readonly sortOptions = PRODUCT_SORT_OPTIONS;
  protected readonly selectedSort = signal<string>(this.sortOptions[0]);
  protected readonly pinkProducts = toSignal(
    this.taxonomyService.findSubcategoryBySlug('pink-collection').pipe(
      switchMap((match) =>
        match?.subcategory._id
          ? this.productListingService.getProductsBySubcategory(match.subcategory._id, {
              includeDeleted: true,
              fetchAllPages: true,
            })
          : of([] as ProductListItem[]),
      ),
    ),
  );
  protected readonly visibleCount = signal(this.pageSize);
  protected readonly visibleProducts = computed(() => {
    const products = this.pinkProducts();

    return products ? sortProducts(products, this.selectedSort()).slice(0, this.visibleCount()) : [];
  });
  protected readonly canShowMore = computed(() => {
    const products = this.pinkProducts();

    return products ? this.visibleCount() < products.length : false;
  });

  protected trackById(_: number, product: ProductListItem): string {
    return String(product.id);
  }

  protected getButtonLabel(product: ProductListItem): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds().has(productId);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected showMore(): void {
    if (this.isShowingMore()) {
      return;
    }

    this.isShowingMore.set(true);

    window.setTimeout(() => {
      this.visibleCount.update((count) => count + this.pageSize);
      this.isShowingMore.set(false);
    }, 240);
  }

  protected updateSort(value: string): void {
    this.selectedSort.set(value);
    this.visibleCount.set(this.pageSize);
  }

  protected async addToCart(product: ProductListItem, event: MouseEvent): Promise<void> {
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
        description: `${product.name} pink collection product`,
        image: product.primaryImageUrl,
        detailFolder: 'pink-collection',
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
