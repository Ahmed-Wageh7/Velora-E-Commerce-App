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

export interface CheckoutApiResponse {
  success?: boolean;
  message?: string;
  order?: unknown;
  data?: unknown;
}

export interface StripeIntentApiResponse {
  clientSecret?: string;
  paymentIntentId?: string;
  data?: unknown;
}

export type CheckoutResult =
  | {
      ok: true;
      message: string;
      order: CheckoutOrderConfirmation | null;
    }
  | {
      ok: false;
      error: string;
    };

export interface SubmittedOrderState extends CheckoutOrderConfirmation {
  message: string;
}
