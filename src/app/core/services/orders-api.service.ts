import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { getApiBaseUrl } from './product-api.utils';

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

export interface CreatePaymentIntentPayload {
  amount: number;
  currency: string;
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

type PaymentIntentResult =
  | {
      ok: true;
      clientSecret: string;
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

  async createPaymentIntent(
    payload: CreatePaymentIntentPayload,
  ): Promise<PaymentIntentResult> {
    try {
      const response = await firstValueFrom(
        this.http
          .post<CheckoutApiResponse>(
            `${this.ordersUrl}/stripe/payment-intent`,
            payload,
          )
          .pipe(timeout(15000)),
      );

      const clientSecret = this.extractClientSecret(response);

      if (!clientSecret) {
        return {
          ok: false,
          error: 'The payment session could not be started. Please try again.',
        };
      }

      return {
        ok: true,
        clientSecret,
      };
    } catch (error) {
      return { ok: false, error: this.getErrorMessage(error) };
    }
  }

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

  private extractMessage(response: CheckoutApiResponse): string {
    const responseRecord = this.asRecord(response);
    const data = this.asRecord(response.data);

    return (
      this.readString(responseRecord, ['message']) ??
      this.readString(data, ['message']) ??
      'Your order has been submitted successfully.'
    );
  }

  private extractClientSecret(response: CheckoutApiResponse): string | null {
    const responseRecord = this.asRecord(response);
    const data = this.asRecord(response.data);
    const paymentIntent = this.asRecord(data?.['paymentIntent']);

    return (
      this.readString(responseRecord, ['clientSecret']) ??
      this.readString(data, ['clientSecret']) ??
      this.readString(paymentIntent, ['client_secret', 'clientSecret'])
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
