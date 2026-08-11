import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartAnimationService } from '../../../../core/cart/cart-animation.service';
import { CartService } from '../../../../core/cart/cart.service';
import { FragrancesService } from '../../../../core/api/fragrances.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { toRequestState } from '../../../../core/utils/request-state';
import { FragranceProduct } from '../../../../models/product/home-product.model';

@Component({
  selector: 'app-fragrances-section',
  imports: [RouterLink],
  templateUrl: './fragrances-section.html',
  styleUrl: './fragrances-section.scss',
})
export class FragrancesSectionComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly fragrancesService = inject(FragrancesService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly loadingProductIds = new Set<string>();
  protected readonly detailsFolder = 'fragrances';

  protected readonly fragrancesState = toSignal(
    toRequestState(this.fragrancesService.getFragrances(), {
      initialData: [] as FragranceProduct[],
      loadingMessage: 'Loading products...',
      emptyMessage: 'No fragrances are available right now.',
      errorMessage: 'We could not load fragrances right now.',
    }),
    {
      initialValue: {
        status: 'loading',
        data: [] as FragranceProduct[],
        message: 'Loading products...',
      },
    },
  );

  protected trackById(_: number, product: FragranceProduct): string {
    return String(product.id);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getButtonLabel(product: FragranceProduct): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  protected async addToCart(product: FragranceProduct, event: MouseEvent): Promise<void> {
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
        description: `${product.name} fragrance`,
        image: product.imageUrl,
        detailFolder: this.detailsFolder,
      });

      if (!added) {
        return;
      }

      await Promise.all([
        this.waitForButtonFeedback(),
        this.cartAnimationService.animateFromTrigger(trigger, product.imageUrl),
      ]);
      this.toastService.showAddedToCart({
        name: product.name,
        image: product.imageUrl,
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
