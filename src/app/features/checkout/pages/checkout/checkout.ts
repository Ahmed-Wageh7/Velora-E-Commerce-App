import { ChangeDetectorRef, Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CartItem, CartService } from '../../../../core/services/cart.service';
import { CollectionProductsService } from '../../../../core/services/collection-products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SiteNavbar } from '../../../../shared/components/site-navbar/site-navbar';

@Component({
  selector: 'app-checkout-page',
  imports: [CurrencyPipe, RouterLink, SiteNavbar],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CheckoutPageComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly toastService = inject(ToastService);
  private readonly promiseBagsSubcategoryId = '69d4fe299e39253830600a70';
  protected activeLineItemId: string | null = null;
  protected activeLineItemAction: 'increase' | 'decrease' | 'remove' | null = null;

  protected readonly cartItems = this.cartService.items;
  protected readonly total = this.cartService.total;
  protected readonly itemCount = computed(() =>
    this.cartItems().reduce((count, item) => count + item.quantity, 0),
  );
  protected readonly subtotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.cartService.syncCartFromApi(true);
    }
  }

  protected getProductRoute(item: CartItem): (number | string)[] {
    const productId = item.detailProductId ?? item.id;
    return item.detailFolder ? ['/product', item.detailFolder, productId] : ['/product', productId];
  }

  protected async openProductDetails(item: CartItem, event: Event): Promise<void> {
    event.preventDefault();

    if (item.detailFolder === 'promise-bags') {
      const productId = await this.resolvePromiseBagProductId(item);
      await this.router.navigate(['/product', 'promise-bags', productId ?? item.detailProductId ?? item.id]);
      return;
    }

    await this.router.navigate(this.getProductRoute(item));
  }

  protected isProcessingItem(productId: string, action: 'increase' | 'decrease' | 'remove'): boolean {
    return this.activeLineItemId === productId && this.activeLineItemAction === action;
  }

  protected async increase(productId: string): Promise<void> {
    this.activeLineItemId = productId;
    this.activeLineItemAction = 'increase';
    this.changeDetectorRef.detectChanges();
    this.cartService.incrementQuantity(productId);
    await this.waitForButtonFeedback();
    this.clearLineItemState();
    this.toastService.show('Cart updated', 'Item quantity increased.', 'success', 1600);
  }

  protected async decrease(productId: string): Promise<void> {
    this.activeLineItemId = productId;
    this.activeLineItemAction = 'decrease';
    this.changeDetectorRef.detectChanges();
    this.cartService.decrementQuantity(productId);
    await this.waitForButtonFeedback();
    this.clearLineItemState();
    this.toastService.show('Cart updated', 'Item quantity decreased.', 'info', 1600);
  }

  protected async remove(productId: string): Promise<void> {
    this.activeLineItemId = productId;
    this.activeLineItemAction = 'remove';
    this.changeDetectorRef.detectChanges();
    await this.waitForButtonFeedback();
    const removed = await this.cartService.removeItemWithApi(productId);
    this.clearLineItemState();

    if (removed) {
      this.toastService.show('Product deleted successfully', '', 'success');
    }
  }

  protected async confirmPurchase(): Promise<void> {
    if (!this.cartItems().length) {
      this.toastService.show('Cart is empty', 'Add a product before confirming purchase.', 'error');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.toastService.show('Sign in required', 'Sign in to continue with your order.', 'error', 1800);
      await this.router.navigate(['/auth/signin'], {
        queryParams: { returnUrl: '/checkout' },
      });
      return;
    }

    this.toastService.show('Order ready', 'Your order is ready to be submitted.', 'success');
  }

  private clearLineItemState(): void {
    this.activeLineItemId = null;
    this.activeLineItemAction = null;
    this.changeDetectorRef.detectChanges();
  }

  private async resolvePromiseBagProductId(item: CartItem): Promise<string | null> {
    try {
      const products = await firstValueFrom(
        this.collectionProductsService.getProductsBySubcategoryId(this.promiseBagsSubcategoryId, true, {
          includeDeleted: true,
        }),
      );
      const normalizedName = this.normalizeLookup(item.name);
      const normalizedImage = this.normalizeLookup(item.image);
      const match = products.find((product) => {
        const sameName = normalizedName && this.normalizeLookup(product.name) === normalizedName;
        const sameImage = normalizedImage && this.normalizeLookup(product.primaryImageUrl) === normalizedImage;
        return sameName || sameImage;
      });

      return match?.id ?? null;
    } catch {
      return null;
    }
  }

  private normalizeLookup(value: string | undefined): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/+/, '');
  }

  private waitForButtonFeedback(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 220));
  }
}
