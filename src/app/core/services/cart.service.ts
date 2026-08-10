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
import { CartApiService, CartApiItem } from "./cart-api.service";
import { Product } from "./products.service";
import { ToastService } from "./toast.service";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  coverImage: string | null;
  images: string[];
  quantity: number;
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

    const items: CartItem[] = result.items.map(
      (item: CartApiItem): CartItem => ({
        id: item.cartItemId,
        productId: item.productId,
        name: item.name,
        description: item.description ?? "",
        price: item.price,
        image: item.image,
        coverImage: item.coverImage,
        images: item.images,
        quantity: item.quantity,
      }),
    );

    this.cartItems.set(items);

    return true;
  }

  async addToCart(product: Product, quantity = 1): Promise<boolean> {
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

  clearCart(): void {
    this.cartItems.set([]);
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
