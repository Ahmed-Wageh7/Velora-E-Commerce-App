import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartAnimationService } from '../../../../core/services/cart-animation.service';
import { CartService } from '../../../../core/services/cart.service';
import { ArtDedicationProduct, ArtDedicationService } from '../../../../core/services/art-dedication.service';
import { ToastService } from '../../../../core/services/toast.service';
import { toRequestState } from '../../../../core/utils/request-state';

@Component({
  selector: 'app-art-dedication',
  imports: [RouterLink],
  templateUrl: './art-dedication.html',
  styleUrl: './art-dedication.scss',
})
export class ArtDedicationComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly artDedicationService = inject(ArtDedicationService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly loadingProductIds = new Set<string>();
  protected readonly detailsFolder = 'The-Art-Dedication';

  protected readonly productsState = toSignal(
    toRequestState(this.artDedicationService.getArtDedicationProducts(), {
      initialData: [] as ArtDedicationProduct[],
      loadingMessage: 'Loading products...',
      emptyMessage: 'No products are available in this collection yet.',
      errorMessage: 'We could not load this collection right now.',
    }),
    {
      initialValue: {
        status: 'loading',
        data: [] as ArtDedicationProduct[],
        message: 'Loading products...',
      },
    },
  );

  protected trackById(_: number, product: ArtDedicationProduct): string {
    return `${product.id}`;
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getButtonLabel(product: ArtDedicationProduct): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  protected async addToCart(product: ArtDedicationProduct, event: MouseEvent): Promise<void> {
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
        description: `${product.name} art of dedication product`,
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
