import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartAnimationService } from '../../../../core/services/cart-animation.service';
import { CartService } from '../../../../core/services/cart.service';
import { CollectionProduct, CollectionProductsService } from '../../../../core/services/collection-products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { toRequestState } from '../../../../core/utils/request-state';

@Component({
  selector: 'app-promise-showcase',
  imports: [RouterLink],
  templateUrl: './promise-showcase.html',
  styleUrl: './promise-showcase.scss',
})
export class PromiseShowcaseComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly loadingProductIds = new Set<string>();
  protected readonly detailsFolder = 'promise-bags';
  private readonly promiseBagsSubcategoryId = '69d4fe299e39253830600a70';

  protected readonly productsState = toSignal(
    toRequestState(this.collectionProductsService.getProductsBySubcategoryId(this.promiseBagsSubcategoryId, true, {
      includeDeleted: true,
    }), {
      initialData: [] as CollectionProduct[],
      loadingMessage: 'Loading products...',
      emptyMessage: 'No Promise Bags products are available right now.',
      errorMessage: 'We could not load Promise Bags right now.',
    }),
    {
      initialValue: {
        status: 'loading',
        data: [] as CollectionProduct[],
        message: 'Loading products...',
      },
    },
  );

  protected trackById(_: number, product: CollectionProduct): string {
    return String(product.id);
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
