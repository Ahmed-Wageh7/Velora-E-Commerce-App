import {
  ElementRef,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
} from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom, of } from "rxjs";
import { AuthService } from "../../../../core/auth/auth.service";
import { CartService } from "../../../../core/cart/cart.service";
import { OrdersApiService } from "../../../../core/checkout/orders-api.service";
import { ProductDetailsService } from "../../../../core/api/product-details.service";
import { ProductListingService } from "../../../../core/api/product-listing.service";
import { ProductsService } from "../../../../core/api/products.service";
import { StripePaymentService } from "../../../../core/checkout/stripe-payment.service";
import { ToastService } from "../../../../core/notifications/toast.service";
import { SiteNavbar } from "../../../../layout/site-navbar/site-navbar";
import { CartItem } from "../../../../models/cart/cart.model";
import { SubmittedOrderState } from "../../../../models/checkout/order.model";
import { StripeCardElement } from "../../../../models/checkout/stripe.model";
import { ProductListItem } from "../../../../models/product/product-list-item.model";

@Component({
  selector: "app-checkout-page",
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, SiteNavbar],
  templateUrl: "./checkout.html",
  styleUrl: "./checkout.scss",
})
export class CheckoutPageComponent implements OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly ordersApiService = inject(OrdersApiService);
  private readonly productDetailsService = inject(ProductDetailsService);
  private readonly productListingService = inject(ProductListingService);
  private readonly productsService = inject(ProductsService);
  private readonly stripePaymentService = inject(StripePaymentService);
  private readonly toastService = inject(ToastService);
  protected activeLineItemId: string | null = null;
  protected activeLineItemAction: "increase" | "decrease" | "remove" | null =
    null;
  protected isSubmittingOrder = false;
  protected orderErrorMessage = "";
  protected cardErrorMessage = "";
  protected isStripeCardReady = false;
  protected submittedOrder: SubmittedOrderState | null = null;
  private stripeCard: StripeCardElement | null = null;
  private stripeCardContainer: ElementRef<HTMLElement> | null = null;
  private stripeCardMountPromise: Promise<void> | null = null;

  @ViewChild("stripeCardElement")
  set stripeCardElementHost(host: ElementRef<HTMLElement> | undefined) {
    this.stripeCardContainer = host ?? null;

    if (host) {
      void this.mountStripeCard();
    }
  }

  protected readonly cartItems = this.cartService.items;
  protected readonly total = this.cartService.total;
  protected readonly itemCount = computed(() =>
    this.cartItems().reduce((count, item) => count + item.quantity, 0),
  );
  protected readonly subtotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  protected readonly orderForm = this.formBuilder.group({
    paymentMethod: this.formBuilder.control("card", [Validators.required]),
    shippingAddress: this.formBuilder.group({
      street: this.formBuilder.control("Nasr City", [
        Validators.required,
        Validators.minLength(3),
      ]),
      city: this.formBuilder.control("Cairo", [
        Validators.required,
        Validators.minLength(2),
      ]),
      country: this.formBuilder.control("Egypt", [
        Validators.required,
        Validators.minLength(2),
      ]),
      postalCode: this.formBuilder.control("11765", [
        Validators.required,
        Validators.minLength(3),
      ]),
    }),
  });
  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.cartService.syncCartFromApi(true);
    }
  }

  ngOnDestroy(): void {
    this.stripeCard?.destroy();
    this.stripeCard = null;
  }

  protected get isCheckoutBusy(): boolean {
    return this.isSubmittingOrder;
  }

  protected async openProductDetails(
    item: CartItem,
    event: Event,
  ): Promise<void> {
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

  protected isProcessingItem(
    productId: string,
    action: "increase" | "decrease" | "remove",
  ): boolean {
    return (
      this.activeLineItemId === productId &&
      this.activeLineItemAction === action
    );
  }

  protected async increase(item: CartItem): Promise<void> {
    this.activeLineItemId = item.id;
    this.activeLineItemAction = "increase";
    this.changeDetectorRef.detectChanges();
    const updated = await this.cartService.updateQuantityWithApi(
      item,
      item.quantity + 1,
    );
    this.clearLineItemState();

    if (updated) {
      this.toastService.showCartStatus(
        "Cart updated",
        "Item quantity increased.",
        "success",
        1600,
      );
    }
  }

  protected async decrease(item: CartItem): Promise<void> {
    this.activeLineItemId = item.id;
    this.activeLineItemAction = "decrease";
    this.changeDetectorRef.detectChanges();
    const nextQuantity = item.quantity - 1;
    const updated = await this.cartService.updateQuantityWithApi(
      item,
      nextQuantity,
    );
    this.clearLineItemState();

    if (updated) {
      const message =
        nextQuantity > 0
          ? "Item quantity decreased."
          : "Item removed from cart.";
      this.toastService.showCartStatus("Cart updated", message, "info", 1600);
    }
  }

  protected async remove(item: CartItem): Promise<void> {
    this.activeLineItemId = item.id;
    this.activeLineItemAction = "remove";
    this.changeDetectorRef.detectChanges();
    const removed = await this.cartService.removeItemWithApi(item);
    this.clearLineItemState();

    if (removed) {
      this.toastService.showCartStatus(
        "Product deleted successfully",
        "",
        "success",
        1600,
      );
    }
  }

  protected async confirmPurchase(): Promise<void> {
    if (this.isCheckoutBusy) {
      return;
    }

    if (!this.cartItems().length) {
      this.toastService.show(
        "Cart is empty",
        "Add a product before confirming purchase.",
        "error",
      );
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.toastService.show(
        "Sign in required",
        "Sign in to continue with your order.",
        "error",
        1800,
      );
      await this.router.navigate(["/auth/signin"], {
        queryParams: { returnUrl: "/checkout" },
      });
      return;
    }

    this.orderForm.markAllAsTouched();
    this.orderErrorMessage = "";
    this.cardErrorMessage = "";

    if (this.orderForm.invalid) {
      this.toastService.show(
        "Shipping details required",
        "Please complete the delivery details before submitting your order.",
        "error",
        2400,
      );
      return;
    }

    await this.mountStripeCard();

    if (!this.stripeCard) {
      this.orderErrorMessage =
        this.cardErrorMessage ||
        "Card payment is not ready yet. Please check your Stripe setup.";
      this.toastService.show(
        "Payment is not ready",
        this.orderErrorMessage,
        "error",
        2600,
      );
      return;
    }

    this.isSubmittingOrder = true;
    this.submittedOrder = null;
    this.changeDetectorRef.detectChanges();

    try {
      const formValue = this.orderForm.getRawValue();
      const payload = {
        ...formValue,
        paymentMethod: "card",
      };
      const result = await this.ordersApiService.checkout(payload);

      if (!result.ok) {
        this.orderErrorMessage = result.error;
        this.toastService.show(
          "Could not submit order",
          result.error,
          "error",
          2600,
        );
        return;
      }

      const orderId = result.order?.id;

      if (!orderId) {
        this.orderErrorMessage =
          "The backend created the order but did not return an order ID for Stripe.";
        this.toastService.show(
          "Could not start payment",
          this.orderErrorMessage,
          "error",
          2600,
        );
        return;
      }

      const intentResult =
        await this.ordersApiService.createStripePaymentIntent(orderId);

      if (!intentResult.ok) {
        this.orderErrorMessage = intentResult.error;
        this.toastService.show(
          "Could not start payment",
          intentResult.error,
          "error",
          2600,
        );
        return;
      }

      const user = this.authService.currentUser();
      const paymentResult = await this.stripePaymentService.confirmCardPayment(
        intentResult.clientSecret,
        this.stripeCard,
        {
          name: user?.name,
          email: user?.email,
        },
      );

      if (!paymentResult.ok) {
        this.orderErrorMessage = paymentResult.error;
        this.cardErrorMessage = paymentResult.error;
        this.toastService.show(
          "Payment failed",
          paymentResult.error,
          "error",
          3000,
        );
        return;
      }

      this.submittedOrder = {
        id: result.order?.id ?? null,
        status: "paid",
        paymentMethod: "card",
        shippingAddress:
          result.order?.shippingAddress ?? payload.shippingAddress,
        message: "Payment completed successfully and your order was submitted.",
      };

      this.cartService.clearCart();
      this.toastService.show(
        "Payment completed",
        "Your card payment was successful.",
        "success",
        2200,
      );
    } finally {
      this.isSubmittingOrder = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  private async mountStripeCard(): Promise<void> {
    if (this.stripeCard) {
      return;
    }

    const container = this.stripeCardContainer?.nativeElement;

    if (!container) {
      return;
    }

    if (this.stripeCardMountPromise) {
      return this.stripeCardMountPromise;
    }

    this.cardErrorMessage = "";
    this.stripeCardMountPromise = this.stripePaymentService
      .createCardElement(container)
      .then((card) => {
        this.stripeCard = card;
        this.isStripeCardReady = true;
        card.on("change", (event) => {
          this.cardErrorMessage = event.error?.message ?? "";
          this.changeDetectorRef.detectChanges();
        });
      })
      .catch((error: unknown) => {
        this.isStripeCardReady = false;
        this.cardErrorMessage = this.readErrorMessage(
          error,
          "Could not initialize Stripe payments.",
        );
      })
      .finally(() => {
        this.stripeCardMountPromise = null;
        this.changeDetectorRef.detectChanges();
      });

    return this.stripeCardMountPromise;
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { message?: string })?.message;
    return typeof message === "string" && message.trim() ? message : fallback;
  }

  private clearLineItemState(): void {
    this.activeLineItemId = null;
    this.activeLineItemAction = null;
    this.changeDetectorRef.detectChanges();
  }

  private async resolveProductRoute(
    item: CartItem,
  ): Promise<(number | string)[]> {
    const productId = item.productId || item.detailProductId || item.id;
    return ["/product", productId];
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

    const catalogProducts = await firstValueFrom(
      this.productsService.getProducts(),
    );
    const catalogMatch = catalogProducts.find((product) => {
      const sameName =
        this.normalizeLookup(product.name) === this.normalizeLookup(item.name);
      const sameImage =
        this.normalizeLookup(product.image) ===
        this.normalizeLookup(item.image);
      return sameName || sameImage;
    });

    return catalogMatch?.id ?? item.id;
  }

  private async resolveCollectionProductId(
    item: CartItem,
  ): Promise<string | null> {
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
    const subcategoryId = LEGACY_DETAIL_FOLDER_SUBCATEGORY_IDS[folder];

    if (subcategoryId) {
      return this.productListingService.getProductsBySubcategory(subcategoryId, {
          includeDeleted: true,
          fetchAllPages: true,
        });
    }

    return of([] as ProductListItem[]);
  }

  private findMatchingCollectionProductId(
    item: CartItem,
    products: ProductListItem[],
  ): ProductListItem | null {
    const normalizedName = this.normalizeLookup(item.name);
    const normalizedImage = this.normalizeLookup(item.image);
    const normalizedDescription = this.normalizeLookup(item.description);

    const exactNameAndImageMatch = products.find((product) => {
      const sameName =
        normalizedName && this.normalizeLookup(product.name) === normalizedName;
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

    const nameMatch = products.find(
      (product) =>
        normalizedName && this.normalizeLookup(product.name) === normalizedName,
    );

    if (nameMatch) {
      return nameMatch;
    }

    const imageMatch = products.find(
      (product) =>
        normalizedImage &&
        [product.primaryImageUrl, product.hoverImageUrl, product.coverImageUrl]
          .map((value) => this.normalizeLookup(value))
          .includes(normalizedImage),
    );

    if (imageMatch) {
      return imageMatch;
    }

    return (
      products.find(
        (product) =>
          normalizedDescription &&
          normalizedDescription.includes(this.normalizeLookup(product.name)),
      ) ?? null
    );
  }

  private normalizeLookup(value: string | undefined): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/+/, "");
  }
}

const LEGACY_DETAIL_FOLDER_SUBCATEGORY_IDS: Record<string, string> = {
  "Arrogate-collection": "69d50edf9e39253830600b30",
  "category-frankel": "69d506d49e39253830600ace",
  "pink-collection": "69d506d49e39253830600acf",
  "promise-bags": "69d4fe299e39253830600a70",
  "women-bags": "69d4fe299e39253830600a6e",
  "children-bags": "69d4fe299e39253830600a6f",
  "classic-watches": "69d4fe2a9e39253830600a71",
  "sports-watches": "69d4fe2b9e39253830600a73",
  "sport-watches": "69d4fe2b9e39253830600a73",
  "women-watches": "69d4fe2a9e39253830600a72",
  "men-sunglasses": "69d4fe289e39253830600a6d",
  "women-sunglasses": "69d4fe289e39253830600a6c",
  "buy-one-get2-free": "69d9151a9e392538306047eb",
  "buy-two-get-third-free": "69d915199e392538306047ea",
  care: "69d534779e39253830600cc2",
};
