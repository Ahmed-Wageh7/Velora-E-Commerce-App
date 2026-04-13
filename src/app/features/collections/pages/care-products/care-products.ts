import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartAnimationService } from '../../../../core/services/cart-animation.service';
import { CartService } from '../../../../core/services/cart.service';
import { CareProduct, CareProductsService } from '../../../../core/services/care-products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SiteNavbar } from '../../../../shared/components/site-navbar/site-navbar';
import { toRequestState } from '../../../../core/utils/request-state';

@Component({
  selector: 'app-care-products-page',
  imports: [RouterLink, SiteNavbar],
  templateUrl: './care-products.html',
  styleUrl: './care-products.scss',
})
export class CareProductsPageComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly careProductsService = inject(CareProductsService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 15;
  private readonly loadingProductIds = new Set<string>();
  protected readonly detailsFolder = 'care';
  protected isShowingMore = false;

  protected readonly sortOptions = ['Our Suggestions', 'Newest', 'Price: Low to High', 'Price: High to Low'];
  protected selectedSort = this.sortOptions[0];
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
  protected visibleCount = this.pageSize;

  protected trackByName(_: number, product: CareProduct): string {
    return `${product.id}`;
  }

  protected getButtonLabel(product: CareProduct): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getVisibleProducts(products: CareProduct[]): CareProduct[] {
    return this.getSortedProducts(products).slice(0, this.visibleCount);
  }

  protected canShowMore(products: CareProduct[]): boolean {
    return this.visibleCount < this.getSortedProducts(products).length;
  }

  protected async showMore(): Promise<void> {
    this.isShowingMore = true;
    await this.waitForButtonFeedback();
    this.visibleCount += this.pageSize;
    this.isShowingMore = false;
  }

  protected updateSort(value: string): void {
    this.selectedSort = value;
    this.visibleCount = this.pageSize;
  }

  private getSortedProducts(products: CareProduct[]): CareProduct[] {
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

  protected async addToCart(product: CareProduct, event: MouseEvent): Promise<void> {
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
        description: `${product.name} care product`,
        image: product.primaryImageUrl,
        detailFolder: this.detailsFolder,
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

  private waitForButtonFeedback(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 240));
  }
}
