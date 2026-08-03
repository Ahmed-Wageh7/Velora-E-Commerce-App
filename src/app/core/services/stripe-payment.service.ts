import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface StripeCardElement {
  mount(domElement: HTMLElement): void;
  unmount(): void;
  destroy(): void;
  on(eventName: 'change', handler: (event: { error?: { message?: string } }) => void): void;
}

interface StripeElements {
  create(type: 'card', options?: Record<string, unknown>): StripeCardElement;
}

interface StripePaymentIntent {
  id: string;
  status: string;
}

interface StripeConfirmCardPaymentResult {
  error?: {
    message?: string;
  };
  paymentIntent?: StripePaymentIntent;
}

interface StripeInstance {
  elements(): StripeElements;
  confirmCardPayment(
    clientSecret: string,
    data: {
      payment_method: {
        card: StripeCardElement;
        billing_details?: {
          name?: string;
          email?: string;
        };
      };
    },
  ): Promise<StripeConfirmCardPaymentResult>;
}

type StripeFactory = (publishableKey: string) => StripeInstance | null;

interface StripeWindow extends Window {
  Stripe?: StripeFactory;
}

@Injectable({
  providedIn: 'root',
})
export class StripePaymentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private stripePromise: Promise<StripeInstance> | null = null;

  async createCardElement(container: HTMLElement): Promise<StripeCardElement> {
    const stripe = await this.getStripe();
    const card = stripe.elements().create('card', {
      hidePostalCode: true,
      style: {
        base: {
          color: '#685b49',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '15px',
          '::placeholder': {
            color: '#aa9b86',
          },
        },
        invalid: {
          color: '#c45845',
        },
      },
    });

    card.mount(container);
    return card;
  }

  async confirmCardPayment(
    clientSecret: string,
    card: StripeCardElement,
    billingDetails?: { name?: string; email?: string },
  ): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
    const stripe = await this.getStripe();
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: billingDetails,
      },
    });

    if (result.error) {
      return {
        ok: false,
        error: result.error.message ?? 'Stripe could not complete this payment.',
      };
    }

    const status = result.paymentIntent?.status ?? 'unknown';
    if (status !== 'succeeded') {
      return {
        ok: false,
        error: `Payment was not completed. Stripe status: ${status}.`,
      };
    }

    return { ok: true, status };
  }

  private getStripe(): Promise<StripeInstance> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(new Error('Stripe payments are only available in the browser.'));
    }

    if (!environment.stripePublishableKey || environment.stripePublishableKey.includes('replace_with')) {
      return Promise.reject(
        new Error('Stripe publishable key is missing. Add it to src/environments/environment.ts.'),
      );
    }

    if (!this.stripePromise) {
      this.stripePromise = this.loadStripe();
    }

    return this.stripePromise;
  }

  private loadStripe(): Promise<StripeInstance> {
    const stripeWindow = this.document.defaultView as StripeWindow | null;

    if (!stripeWindow) {
      return Promise.reject(new Error('Stripe is not available in this browser context.'));
    }

    if (stripeWindow.Stripe) {
      return this.createStripeInstance(stripeWindow.Stripe);
    }

    return new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {
        if (!stripeWindow.Stripe) {
          reject(new Error('Stripe failed to initialize.'));
          return;
        }

        this.createStripeInstance(stripeWindow.Stripe).then(resolve).catch(reject);
      };
      script.onerror = () => reject(new Error('Could not load Stripe.js.'));

      this.document.head.appendChild(script);
    });
  }

  private createStripeInstance(stripeFactory: StripeFactory): Promise<StripeInstance> {
    const stripe = stripeFactory(environment.stripePublishableKey);

    if (!stripe) {
      return Promise.reject(new Error('Stripe rejected the publishable key.'));
    }

    return Promise.resolve(stripe);
  }
}
