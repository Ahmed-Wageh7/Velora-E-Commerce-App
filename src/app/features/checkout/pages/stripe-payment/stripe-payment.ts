import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import {
  Stripe,
  StripeCardElement,
  StripeCardElementChangeEvent,
  StripeElements,
} from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import {
  CheckoutOrderConfirmation,
  CheckoutOrderPayload,
  OrdersApiService,
} from "../../../../core/services/orders-api.service";
import { CartService } from "../../../../core/services/cart.service";
import { ToastService } from "../../../../core/services/toast.service";
import { SiteNavbar } from "../../../../shared/components/site-navbar/site-navbar";
import { environment } from "../../../../../environments/environment";

loadStripe.setLoadParameters({ advancedFraudSignals: false });

interface StripePaymentState {
  checkoutPayload?: CheckoutOrderPayload;
  checkoutTotal?: number;
  checkoutItemCount?: number;
}

interface SubmittedOrderState extends CheckoutOrderConfirmation {
  message: string;
}

@Component({
  selector: "app-stripe-payment-page",
  imports: [CurrencyPipe, RouterLink, SiteNavbar],
  templateUrl: "./stripe-payment.html",
  styleUrl: "./stripe-payment.scss",
})
export class StripePaymentPageComponent implements AfterViewInit, OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly ordersApiService = inject(OrdersApiService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);

  @ViewChild("cardElementHost")
  private cardElementHost?: ElementRef<HTMLDivElement>;

  protected isProcessingPayment = false;
  protected isStripeReady = false;
  protected paymentErrorMessage = "";
  protected submittedOrder: SubmittedOrderState | null = null;
  protected readonly paymentState: StripePaymentState =
    (this.router.getCurrentNavigation()?.extras.state as StripePaymentState) ??
    (history.state as StripePaymentState);
  protected readonly checkoutPayload = this.paymentState.checkoutPayload ?? null;
  protected readonly checkoutTotal = Number(this.paymentState.checkoutTotal ?? 0);
  protected readonly checkoutItemCount = Number(
    this.paymentState.checkoutItemCount ?? 0,
  );

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeCardElement | null = null;
  private isStripeElementMounted = false;

  async ngAfterViewInit(): Promise<void> {
    if (!this.checkoutPayload || this.checkoutPayload.paymentMethod !== "stripe") {
      this.toastService.show(
        "Payment details missing",
        "Please return to checkout and submit your order again.",
        "error",
        2600,
      );
      await this.router.navigate(["/checkout"]);
      return;
    }

    await this.initializeStripeCardElement();
  }

  ngOnDestroy(): void {
    this.cardElement?.destroy();
  }

  protected async submitStripePayment(): Promise<void> {
    if (this.isProcessingPayment) {
      return;
    }

    if (!this.isStripeReady) {
      this.paymentErrorMessage =
        "Stripe could not load in this browser tab. Disable ad blockers or privacy shields, then refresh the page and try again.";
      this.toastService.show(
        "Stripe unavailable",
        this.paymentErrorMessage,
        "error",
        3200,
      );
      this.changeDetectorRef.detectChanges();
      return;
    }

    if (!this.checkoutPayload) {
      this.toastService.show(
        "Payment details missing",
        "Please return to checkout and submit your order again.",
        "error",
        2600,
      );
      await this.router.navigate(["/checkout"]);
      return;
    }

    this.paymentErrorMessage = "";
    this.isProcessingPayment = true;
    this.changeDetectorRef.detectChanges();

    try {
      const paymentResult = await this.processStripePayment();

      if (!paymentResult.ok) {
        this.paymentErrorMessage = paymentResult.error;
        this.toastService.show(
          "Payment failed",
          paymentResult.error,
          "error",
          2600,
        );
        return;
      }

      const result = await this.ordersApiService.checkout(this.checkoutPayload);

      if (!result.ok) {
        this.paymentErrorMessage = result.error;
        this.toastService.show(
          "Could not submit order",
          result.error,
          "error",
          2600,
        );
        return;
      }

      this.submittedOrder = {
        id: result.order?.id ?? null,
        status: result.order?.status ?? "pending",
        paymentMethod:
          result.order?.paymentMethod ?? this.checkoutPayload.paymentMethod,
        shippingAddress:
          result.order?.shippingAddress ?? this.checkoutPayload.shippingAddress,
        message: result.message,
      };

      await this.cartService.syncCartFromApi(true, true);
      this.toastService.show(
        "Order submitted",
        result.message,
        "success",
        2200,
      );
    } finally {
      this.isProcessingPayment = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  private async initializeStripeCardElement(): Promise<void> {
    if (typeof window === "undefined" || this.isStripeElementMounted) {
      return;
    }

    if (!environment.stripePublishableKey.trim()) {
      this.paymentErrorMessage =
        "Stripe is not configured yet. Add your publishable key and try again.";
      this.isStripeReady = false;
      this.changeDetectorRef.detectChanges();
      return;
    }

    if (!this.cardElementHost?.nativeElement) {
      return;
    }

    try {
      this.stripe ??= await Promise.race([
        loadStripe(environment.stripePublishableKey),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 8000);
        }),
      ]);
    } catch {
      this.stripe = null;
    }

    if (!this.stripe) {
      this.paymentErrorMessage =
        "Stripe could not load in this browser tab. Disable ad blockers or privacy shields, then refresh the page and try again.";
      this.isStripeReady = false;
      this.changeDetectorRef.detectChanges();
      return;
    }

    this.elements ??= this.stripe.elements();
    this.cardElement ??= this.elements.create("card", {
      hidePostalCode: true,
      style: {
        base: {
          color: "#685b49",
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          fontSize: "16px",
          "::placeholder": {
            color: "#a79681",
          },
        },
        invalid: {
          color: "#c45845",
        },
      },
    });

    this.cardElement.on("change", (event: StripeCardElementChangeEvent) => {
      this.paymentErrorMessage = event.error?.message ?? "";
      this.changeDetectorRef.detectChanges();
    });

    this.cardElement.mount(this.cardElementHost.nativeElement);
    this.isStripeElementMounted = true;
    this.isStripeReady = true;
    this.changeDetectorRef.detectChanges();
  }

  private async processStripePayment(): Promise<
    | { ok: true }
    | {
        ok: false;
        error: string;
      }
  > {
    if (!this.stripe || !this.cardElement) {
      return {
        ok: false,
        error: "Card form is not ready yet. Please wait a moment and try again.",
      };
    }

    const paymentIntent = await this.ordersApiService.createPaymentIntent({
      amount: Math.round(this.checkoutTotal * 100),
      currency: "usd",
    });

    if (!paymentIntent.ok) {
      return paymentIntent;
    }

    const confirmation = await this.stripe.confirmCardPayment(
      paymentIntent.clientSecret,
      {
        payment_method: {
          card: this.cardElement,
        },
      },
    );

    if (confirmation.error) {
      return {
        ok: false,
        error:
          confirmation.error.message ??
          "Your card could not be authorized. Please check the details and try again.",
      };
    }

    if (confirmation.paymentIntent?.status !== "succeeded") {
      return {
        ok: false,
        error: "Payment was not completed successfully. Please try again.",
      };
    }

    this.paymentErrorMessage = "";
    return { ok: true };
  }
}
