import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import {
  ApiProductRecord,
  getApiBaseUrl,
  getPrimaryImageUrl,
} from "./product-api.utils";

interface CartResponse {
  cart: {
    items: CartApiResponseItem[];
  };
}

interface CartApiResponseItem {
  _id: string;
  product: ApiProductRecord;
  quantity: number;
  price: number;
}

interface CartMutationResponse {
  message: string;
  cart: unknown;
}

export interface CartApiItem {
  cartItemId: string;
  productId: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  coverImage: string | null;
  images: string[];
  quantity: number;
}

@Injectable({
  providedIn: "root",
})
export class CartApiService {
  private readonly http = inject(HttpClient);
  private readonly cartUrl = `${getApiBaseUrl()}/cart`;

  async getCart(): Promise<
    { ok: true; items: CartApiItem[] } | { ok: false; error: string }
  > {
    try {
      const response = await firstValueFrom(
        this.http.get<CartResponse>(this.cartUrl),
      );

      return {
        ok: true,
        items: response.cart.items.map(
          (item): CartApiItem => ({
            cartItemId: item._id,
            productId: item.product._id ?? "",
            name: item.product.name ?? "",
            description: item.product.description,
            price: item.price,
            image: getPrimaryImageUrl(item.product) ?? "",
            coverImage: item.product.coverImage ?? null,
            images: Array.isArray(item.product.images)
              ? item.product.images.filter(
                  (image: unknown): image is string =>
                    typeof image === "string",
                )
              : [],
            quantity: item.quantity,
          }),
        ),
      };
    } catch (error) {
      return {
        ok: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  async addToCart(
    productId: string,
    quantity: number,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.post<CartMutationResponse>(this.cartUrl, {
          productId,
          quantity,
        }),
      );

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  async updateItem(
    productId: string,
    quantity: number,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.put<CartMutationResponse>(`${this.cartUrl}/${productId}`, {
          quantity,
        }),
      );

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  async removeItem(
    productId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.delete<CartMutationResponse>(`${this.cartUrl}/${productId}`),
      );

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === "string" && message.trim()) {
        return message;
      }

      if (error.status === 401) {
        return "Please sign in to manage your cart.";
      }
    }

    return "We could not update your cart right now.";
  }
}
