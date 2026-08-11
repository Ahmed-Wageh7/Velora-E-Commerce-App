import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartAnimationService } from '../../../../core/cart/cart-animation.service';
import { CartService } from '../../../../core/cart/cart.service';
import { ProductListingService } from '../../../../core/api/product-listing.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { toRequestState } from '../../../../core/utils/request-state';
import { ProductListItem } from '../../../../models/product/product-list-item.model';

@Component({
  selector: 'app-promise-showcase',
  imports: [RouterLink],
  templateUrl: './promise-showcase.html',
  styleUrl: './promise-showcase.scss',
})
export class PromiseShowcaseComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly productListingService = inject(ProductListingService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly loadingProductIds = new Set<string>();
  protected readonly detailsFolder = 'promise-bags';
  private readonly promiseBagsSubcategoryId = '69d4fe299e39253830600a70';

  protected readonly productsState = toSignal(
    toRequestState(this.productListingService.getProductsBySubcategory(this.promiseBagsSubcategoryId, {
      fetchAllPages: true,
      includeDeleted: true,
    }), {
      initialData: [] as ProductListItem[],
      loadingMessage: 'Loading products...',
      emptyMessage: 'No Promise Bags products are available right now.',
      errorMessage: 'We could not load Promise Bags right now.',
    }),
    {
      initialValue: {
        status: 'loading',
        data: [] as ProductListItem[],
        message: 'Loading products...',
      },
    },
  );

  protected trackById(_: number, product: ProductListItem): string {
    return String(product.id);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getButtonLabel(product: ProductListItem): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  protected async addToCart(product: ProductListItem, event: MouseEvent): Promise<void> {
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
        description: `${product.name} promise bag`,
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
