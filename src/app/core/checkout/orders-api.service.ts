import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { getApiBaseUrl } from '../api/product-api.utils';

export interface OrderShippingAddress {
  street: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface CheckoutOrderPayload {
  paymentMethod: string;
  shippingAddress: OrderShippingAddress;
}

export interface CheckoutOrderConfirmation {
  id: string | null;
  status: string;
  paymentMethod: string;
  shippingAddress: OrderShippingAddress;
}

interface CheckoutApiResponse {
  success?: boolean;
  message?: string;
  order?: unknown;
  data?: unknown;
}

interface StripeIntentApiResponse {
  clientSecret?: string;
  paymentIntentId?: string;
  data?: unknown;
}

type CheckoutResult =
  | {
      ok: true;
      message: string;
      order: CheckoutOrderConfirmation | null;
    }
  | {
      ok: false;
      error: string;
    };

@Injectable({
  providedIn: 'root',
})
export class OrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly ordersUrl = `${getApiBaseUrl()}/orders`;

  async checkout(payload: CheckoutOrderPayload): Promise<CheckoutResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<CheckoutApiResponse>(`${this.ordersUrl}/checkout`, payload).pipe(timeout(15000)),
      );

      return {
        ok: true,
        message: this.extractMessage(response),
        order: this.extractOrder(response, payload),
      };
    } catch (error) {
      return { ok: false, error: this.getErrorMessage(error) };
    }
  }

  async createStripePaymentIntent(
    orderId: string,
  ): Promise<{ ok: true; clientSecret: string; paymentIntentId: string | null } | { ok: false; error: string }> {
    try {
      const response = await firstValueFrom(
        this.http
          .post<StripeIntentApiResponse>(`${this.ordersUrl}/stripe/payment-intent`, { orderId })
          .pipe(timeout(15000)),
      );
      const responseRecord = this.asRecord(response);
      const data = this.asRecord(response.data);
      const clientSecret =
        this.readString(responseRecord, ['clientSecret']) ??
        this.readString(data, ['clientSecret']);

      if (!clientSecret) {
        return { ok: false, error: 'The backend did not return a Stripe client secret.' };
      }

      return {
        ok: true,
        clientSecret,
        paymentIntentId:
          this.readString(responseRecord, ['paymentIntentId']) ??
          this.readString(data, ['paymentIntentId']),
      };
    } catch (error) {
      return { ok: false, error: this.getErrorMessage(error) };
    }
  }

  private extractMessage(response: CheckoutApiResponse): string {
    const responseRecord = this.asRecord(response);
    const data = this.asRecord(response.data);

    return (
      this.readString(responseRecord, ['message']) ??
      this.readString(data, ['message']) ??
      'Your order has been submitted successfully.'
    );
  }

  private extractOrder(
    response: CheckoutApiResponse,
    payload: CheckoutOrderPayload,
  ): CheckoutOrderConfirmation | null {
    const data = this.asRecord(response.data);
    const rawOrder =
      this.asRecord(response.order) ??
      this.asRecord(data?.['order']) ??
      this.asRecord(data);

    if (!rawOrder) {
      return null;
    }

    const rawShippingAddress = this.asRecord(rawOrder['shippingAddress']);

    return {
      id: this.readString(rawOrder, ['id', '_id', 'orderId']) ?? null,
      status: this.readString(rawOrder, ['status']) ?? 'pending',
      paymentMethod:
        this.readString(rawOrder, ['paymentMethod']) ??
        payload.paymentMethod,
      shippingAddress: {
        street: this.readString(rawShippingAddress, ['street']) ?? payload.shippingAddress.street,
        city: this.readString(rawShippingAddress, ['city']) ?? payload.shippingAddress.city,
        country: this.readString(rawShippingAddress, ['country']) ?? payload.shippingAddress.country,
        postalCode:
          this.readString(rawShippingAddress, ['postalCode']) ?? payload.shippingAddress.postalCode,
      },
    };
  }

  private getErrorMessage(error: unknown): string {
    if ((error as { name?: string })?.name === 'TimeoutError') {
      return 'The order request took too long. Please try again.';
    }

    if (error instanceof HttpErrorResponse) {
      const responseMessage =
        this.readString(this.asRecord(error.error), ['message', 'error']) ??
        (typeof error.error === 'string' ? error.error.trim() : null);

      if (responseMessage) {
        if (responseMessage.toLowerCase().includes('stripe is not configured')) {
          return 'Card payments are temporarily unavailable. Please contact support or try another payment method.';
        }

        return responseMessage;
      }

      if (error.status === 0) {
        return 'We could not reach the server. Please try again.';
      }
    }

    return 'We could not submit your order right now.';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private readString(
    value: Record<string, unknown> | null | undefined,
    keys: string[],
  ): string | null {
    if (!value) {
      return null;
    }

    for (const key of keys) {
      const candidate = value[key];

      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  }
}
