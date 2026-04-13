import { ChangeDetectorRef, Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CartItem, CartService } from '../../../../core/services/cart.service';
import { CollectionProduct, CollectionProductsService } from '../../../../core/services/collection-products.service';
import { ProductDetailsService } from '../../../../core/services/product-details.service';
import { ProductsService } from '../../../../core/services/products.service';
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
  private readonly productDetailsService = inject(ProductDetailsService);
  private readonly productsService = inject(ProductsService);
  private readonly toastService = inject(ToastService);
  private readonly specialCollectionSubcategoryIds: Record<string, string> = {
    'Arrogate-collection': '69d50edf9e39253830600b30',
    'category-frankel': '69d506d49e39253830600ace',
    'promise-bags': '69d4fe299e39253830600a70',
  };
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

  protected async openProductDetails(item: CartItem, event: Event): Promise<void> {
    event.preventDefault();
    await this.router.navigate(await this.resolveProductRoute(item), {
      state: {
        cartProductHint: {
          id: item.id,
          detailProductId: item.detailProductId,
          name: item.name,
          image: item.image,
          description: item.description,
          detailFolder: item.detailFolder,
        },
      },
    });
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

  protected async remove(item: CartItem): Promise<void> {
    this.activeLineItemId = item.id;
    this.activeLineItemAction = 'remove';
    this.changeDetectorRef.detectChanges();
    const removed = await this.cartService.removeItemWithApi(item);
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

  private async resolveProductRoute(item: CartItem): Promise<(number | string)[]> {
    const productId = await this.resolveProductId(item);
    const folder = item.detailFolder?.trim();

    if (folder) {
      const recoveredProduct = await firstValueFrom(this.productDetailsService.recoverProductDetails(folder, item));

      if (recoveredProduct) {
        return ['/product', folder, recoveredProduct.id];
      }
    }

    return folder ? ['/product', folder, productId] : ['/product', productId];
  }

  private async resolveProductId(item: CartItem): Promise<string> {
    if (item.detailFolder) {
      const collectionProductId = await this.resolveCollectionProductId(item);

      if (collectionProductId) {
        return collectionProductId;
      }
    }

    const preferredId = item.detailProductId?.trim();

    if (preferredId) {
      return preferredId;
    }

    const catalogProducts = await firstValueFrom(this.productsService.getProducts());
    const catalogMatch = catalogProducts.find((product) => {
      const sameName = this.normalizeLookup(product.name) === this.normalizeLookup(item.name);
      const sameImage = this.normalizeLookup(product.image) === this.normalizeLookup(item.image);
      return sameName || sameImage;
    });

    return catalogMatch?.id ?? item.id;
  }

  private async resolveCollectionProductId(item: CartItem): Promise<string | null> {
    const folder = item.detailFolder?.trim();

    if (!folder) {
      return null;
    }

    try {
      const products = await firstValueFrom(this.getCollectionProductsForFolder(folder));
      const match = this.findMatchingCollectionProductId(item, products);

      return match?.id ?? null;
    } catch {
      return null;
    }
  }

  private getCollectionProductsForFolder(folder: string) {
    const subcategoryId = this.specialCollectionSubcategoryIds[folder];

    if (subcategoryId) {
      return this.collectionProductsService.getProductsBySubcategoryId(subcategoryId, true, {
        includeDeleted: true,
      });
    }

    return this.collectionProductsService.getCollectionProductsWithOptions(folder, {
      includeDeleted: true,
      fetchAllPages: true,
    });
  }

  private findMatchingCollectionProductId(item: CartItem, products: CollectionProduct[]): CollectionProduct | null {
    const normalizedName = this.normalizeLookup(item.name);
    const normalizedImage = this.normalizeLookup(item.image);
    const normalizedDescription = this.normalizeLookup(item.description);

    const exactNameAndImageMatch = products.find((product) => {
      const sameName = normalizedName && this.normalizeLookup(product.name) === normalizedName;
      const sameImage =
        normalizedImage &&
        [product.primaryImageUrl, product.hoverImageUrl, product.coverImageUrl]
          .map((value) => this.normalizeLookup(value))
          .includes(normalizedImage);

      return Boolean(sameName && sameImage);
    });

    if (exactNameAndImageMatch) {
      return exactNameAndImageMatch;
    }

    const nameMatch = products.find((product) => normalizedName && this.normalizeLookup(product.name) === normalizedName);

    if (nameMatch) {
      return nameMatch;
    }

    const imageMatch = products.find((product) =>
      normalizedImage &&
      [product.primaryImageUrl, product.hoverImageUrl, product.coverImageUrl]
        .map((value) => this.normalizeLookup(value))
        .includes(normalizedImage),
    );

    if (imageMatch) {
      return imageMatch;
    }

    return (
      products.find((product) => normalizedDescription && normalizedDescription.includes(this.normalizeLookup(product.name))) ?? null
    );
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
