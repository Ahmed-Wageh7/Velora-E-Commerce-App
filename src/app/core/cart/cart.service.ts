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
import { AuthService } from "../auth/auth.service";
import { CartApiService } from "./cart-api.service";
import { ToastService } from "../notifications/toast.service";
import { CartApiItem, CartItem } from "../../models/cart/cart.model";
import { Product } from "../../models/product/product.model";

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
    if (typeof item === "string") {
      return this.updateQuantity(item, quantity);
    }

    if (!this.requireAuth("Sign in to manage your cart.")) {
      return false;
    }

    if (quantity <= 0) {
      return this.removeItemWithApi(item);
    }

    const result = await this.tryCartMutation(
      this.getItemMutationIdentifiers(item),
      (identifier) => this.cartApiService.updateItem(identifier, quantity),
    );

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
    return this.removeItemByIdentifiers([productId]);
  }
  async removeItemWithApi(item: CartItem | string): Promise<boolean> {
    if (typeof item === "string") {
      return this.removeItem(item);
    }

    return this.removeItemByIdentifiers(
      this.getItemMutationIdentifiers(item),
      item,
    );
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  private async removeItemByIdentifiers(
    identifiers: string[],
    originalItem?: CartItem,
  ): Promise<boolean> {
    if (!this.requireAuth("Sign in to manage your cart.")) {
      return false;
    }

    let lastError = "We could not update your cart right now.";

    for (const identifier of identifiers) {
      const result = await this.cartApiService.removeItem(identifier);

      if (!result.ok) {
        lastError = result.error;
        continue;
      }

      const loaded = await this.loadCart();

      if (!loaded || !originalItem || !this.hasCartItem(originalItem)) {
        return loaded;
      }
    }

    this.toastService.show(
      "Could not remove product",
      lastError,
      "error",
      2000,
    );

    return false;
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

  private async tryCartMutation(
    identifiers: string[],
    mutation: (
      identifier: string,
    ) => Promise<{ ok: true } | { ok: false; error: string }>,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    let lastError = "We could not update your cart right now.";

    for (const identifier of identifiers) {
      const result = await mutation(identifier);

      if (result.ok) {
        return result;
      }

      lastError = result.error;
    }

    return { ok: false, error: lastError };
  }

  private getItemMutationIdentifiers(item: CartItem): string[] {
    return [item.productId, item.detailProductId, item.id]
      .filter((identifier): identifier is string =>
        Boolean(identifier && identifier.trim()),
      )
      .filter(
        (identifier, index, identifiers) =>
          identifiers.indexOf(identifier) === index,
      );
  }

  private hasCartItem(originalItem: CartItem): boolean {
    return this.cartItems().some(
      (item) =>
        item.id === originalItem.id ||
        item.productId === originalItem.productId,
    );
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

// USER OPENS APP
//       │
//       ▼
// Angular starts
//       │
//       ▼
// AuthService initializes
//       │
//       ▼
// Does user have valid session?
//       │
//       ├── No ───────► isAuthenticated = false
//       │                    │
//       │                    ▼
//       │               Cart = []
//       │
//       └── Yes
//            │
//            ▼
//    Refresh HttpOnly Cookie
//            │
//            ▼
//    Backend returns Access Token
//            │
//            ▼
//    Access Token stored in memory
//            │
//            ▼
//    isAuthenticated = true
//            │
//            ▼
//    CartService effect detects it
//            │
//            ▼
//         loadCart()
//            │
//            ▼
//     CartApiService.getCart()
//            │
//            ▼
//         GET /cart
//            │
//            ▼
//       Auth Interceptor
//            │
//            ▼
//  Authorization: Bearer token
//            │
//            ▼
//         Backend
//            │
//            ▼
//       User's Cart
//            │
//            ▼
//       map response
//            │
//            ▼
//       cartItems.set()
//            │
//            ▼
//            UI updates

// Product Card
//      │
//      ▼
// cartService.addToCart(product)
//      │
//      ▼
// waitForInitialization()
//      │
//      ▼
// requireAuth()
//      │
//      ▼
// CartApiService.addToCart()
//      │
//      ▼
// POST /cart
//      │
//      ▼
// Auth Interceptor
//      │
//      ▼
// Backend
//      │
//      ▼
// Success
//      │
//      ▼
// loadCart()
//      │
//      ▼
// GET /cart
//      │
//      ▼
// cartItems.set(...)
//      │
//      ▼
// computed total updates
//      │
//      ▼
// UI updates
