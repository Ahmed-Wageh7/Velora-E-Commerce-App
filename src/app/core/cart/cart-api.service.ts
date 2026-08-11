import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { getApiBaseUrl, getPrimaryImageUrl } from "../api/product-api.utils";
import {
  CartApiItem,
  CartMutationResponse,
  CartResponse,
} from "../../models/cart/cart.model";
import { ApiProductRecord } from "../../models/product/product-api.model";

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
            productId: String(item.product._id ?? ""),
            name: item.product.name ?? "Product",
            description: item.product.description,
            price: item.price,
            image: getPrimaryImageUrl(item.product) ?? "",
            coverImage: item.product.coverImage ?? null,
            images: this.extractImages(item.product.images),
            quantity: Math.max(1, Math.floor(item.quantity)),
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

  private extractImages(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (image: unknown): image is string => typeof image === "string",
    );
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

      if (error.status === 404) {
        return "Cart service is unavailable right now.";
      }
    }

    return "We could not update your cart right now.";
  }
}

// ┌─────────────────────────────┐
// │         COMPONENT           │
// │ Cart / Product / Navbar     │
// └──────────────┬──────────────┘
//                │
//                ▼
// ┌─────────────────────────────┐
// │        CartService          │
// │                             │
// │ Signals                     │
// │ Business Logic              │
// │ Authentication checks       │
// │ Total                       │
// │ Add / Update / Remove       │
// └──────────────┬──────────────┘
//                │
//                ▼
// ┌─────────────────────────────┐
// │       CartApiService        │
// │                             │
// │ GET /cart                   │
// │ POST /cart                  │
// │ PUT /cart/:id               │
// │ DELETE /cart/:id            │
// │ Response Mapping            │
// │ Error Mapping               │
// └──────────────┬──────────────┘
//                │
//                ▼
// ┌─────────────────────────────┐
// │        HttpClient           │
// │             +               │
// │      Auth Interceptor       │
// └──────────────┬──────────────┘
//                │
//                ▼
// ┌─────────────────────────────┐
// │          BACKEND            │
// │                             │
// │ JWT verification            │
// │ User Cart                   │
// │ Database                    │
// └─────────────────────────────┘
