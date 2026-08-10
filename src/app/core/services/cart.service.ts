import { isPlatformBrowser } from "@angular/common";
import {
  PLATFORM_ID,
  Injectable,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "./auth.service";
import { CartApiItem, CartApiService } from "./cart-api.service";
import { Product } from "./products.service";
import { ToastService } from "./toast.service";

export interface CartItem {
  id: string;
  productId: string;
  detailProductId?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  coverImage: string | null;
  images: string[];
  quantity: number;
  detailFolder?: string;
}

@Injectable({
  providedIn: "root",
})
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cartApiService = inject(CartApiService);
  private readonly toastService = inject(ToastService);

  private readonly cartItems = signal<CartItem[]>([]);

  readonly items = this.cartItems.asReadonly();

  readonly total = computed(() =>
    this.cartItems().reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    ),
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        if (this.authService.isAuthenticated()) {
          void this.loadCart();
        } else {
          this.cartItems.set([]);
        }
      });
    }
  }

  async loadCart(): Promise<boolean> {
    await this.authService.waitForInitialization();

    if (!this.authService.isAuthenticated()) {
      return false;
    }

    const result = await this.cartApiService.getCart();

    if (!result.ok) {
      this.toastService.show(
        "Could not load cart",
        result.error,
        "error",
        2000,
      );

      return false;
    }

    this.cartItems.set(result.items.map((item) => this.toCartItem(item)));

    return true;
  }
  async syncCartFromApi(
    showError = false,
    _forceSync = false,
  ): Promise<boolean> {
    const result = await this.loadCart();

    if (!result && showError) {
      this.toastService.show(
        "Could not sync cart",
        "We could not synchronize your cart right now.",
        "error",
        2000,
      );
    }

    return result;
  }
  async addToCart(product: Product, quantity = 1): Promise<boolean> {
    await this.authService.waitForInitialization();

    if (!this.requireAuth("Sign in to add products to your cart.")) {
      return false;
    }

    const result = await this.cartApiService.addToCart(product.id, quantity);

    if (!result.ok) {
      this.toastService.show(
        "Could not add product",
        result.error,
        "error",
        2000,
      );

      return false;
    }

    return this.loadCart();
  }

  async addToCartWithApi(product: Product, quantity = 1): Promise<boolean> {
    return this.addToCart(product, quantity);
  }

  async updateQuantity(productId: string, quantity: number): Promise<boolean> {
    if (!this.requireAuth("Sign in to manage your cart.")) {
      return false;
    }

    if (quantity <= 0) {
      return this.removeItem(productId);
    }

    const result = await this.cartApiService.updateItem(productId, quantity);

    if (!result.ok) {
      this.toastService.show(
        "Could not update cart",
        result.error,
        "error",
        2000,
      );

      return false;
    }

    return this.loadCart();
  }
  async updateQuantityWithApi(
    item: CartItem | string,
    quantity: number,
  ): Promise<boolean> {
    const productId = typeof item === "string" ? item : item.productId;

    return this.updateQuantity(productId, quantity);
  }

  async increment(productId: string): Promise<boolean> {
    const item = this.cartItems().find((item) => item.productId === productId);

    if (!item) {
      return false;
    }

    return this.updateQuantity(productId, item.quantity + 1);
  }

  async decrement(productId: string): Promise<boolean> {
    const item = this.cartItems().find((item) => item.productId === productId);

    if (!item) {
      return false;
    }

    return this.updateQuantity(productId, item.quantity - 1);
  }

  async removeItem(productId: string): Promise<boolean> {
    if (!this.requireAuth("Sign in to manage your cart.")) {
      return false;
    }

    const result = await this.cartApiService.removeItem(productId);

    if (!result.ok) {
      this.toastService.show(
        "Could not remove product",
        result.error,
        "error",
        2000,
      );

      return false;
    }

    return this.loadCart();
  }
  async removeItemWithApi(item: CartItem | string): Promise<boolean> {
    const productId = typeof item === "string" ? item : item.productId;

    return this.removeItem(productId);
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  private toCartItem(item: CartApiItem): CartItem {
    return {
      id: item.cartItemId,
      productId: item.productId,
      detailProductId: item.productId,
      name: item.name,
      description: item.description ?? item.name,
      price: item.price,
      image: item.image,
      coverImage: item.coverImage,
      images: item.images,
      quantity: item.quantity,
      detailFolder: item.detailFolder,
    };
  }

  private requireAuth(message: string): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    this.toastService.show("Sign in required", message, "error", 1800);

    void this.router.navigate(["/auth/signin"]);

    return false;
  }
}
