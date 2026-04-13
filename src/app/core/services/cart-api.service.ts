import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiImageValue, ApiProductRecord, buildMediaUrl, getApiBaseUrl, getProductId, getPrimaryImageUrl } from './product-api.utils';

interface CartMutationResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

interface CartListResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
  items?: unknown;
  cart?: unknown;
}

interface AddCartItemPayload {
  productId: string;
  quantity: number;
}

interface CartLineRecord {
  _id?: string;
  id?: string;
  product?: ApiProductRecord & { detailFolder?: string; folder?: string; image?: string; primaryImage?: string };
  productId?: ApiProductRecord | string;
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  qty?: number;
  count?: number;
  image?: string;
  primaryImage?: string;
  images?: ApiImageValue[] | ApiImageValue;
  detailFolder?: string;
}

export interface CartApiItem {
  id: string;
  detailProductId?: string;
  name?: string;
  price: number;
  description?: string;
  image?: string;
  quantity: number;
  detailFolder?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CartApiService {
  private readonly http = inject(HttpClient);
  private readonly cartUrl = `${getApiBaseUrl()}/cart`;

  async addToCart(payload: AddCartItemPayload): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.post<CartMutationResponse>(this.cartUrl, {
          productId: payload.productId,
          quantity: payload.quantity,
        }),
      );

      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.getErrorMessage(error) };
    }
  }

  async getCart(): Promise<{ ok: true; items: CartApiItem[] } | { ok: false; error: string }> {
    try {
      const response = await firstValueFrom(this.http.get<CartListResponse>(this.cartUrl));
      return { ok: true, items: this.extractCartItems(response) };
    } catch (error) {
      return { ok: false, error: this.getErrorMessage(error) };
    }
  }

  async removeItem(productId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(this.http.delete<CartMutationResponse>(`${this.cartUrl}/${productId}`));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.getErrorMessage(error) };
    }
  }

  private extractCartItems(response: CartListResponse): CartApiItem[] {
    const responseData = response.data;
    const rawItems =
      (Array.isArray(responseData) ? responseData : null) ??
      (this.readArray(responseData, 'items') ??
        this.readArray(responseData, 'cart') ??
        this.readArray(responseData, 'cartItems') ??
        this.readArray(responseData, 'products')) ??
      this.readNestedArray(responseData, 'cart', 'items') ??
      this.readNestedArray(responseData, 'cart', 'cartItems') ??
      this.readNestedArray(responseData, 'cart', 'products') ??
      this.readArray(response, 'items') ??
      this.readArray(response, 'cart') ??
      this.readArray(response, 'cartItems') ??
      this.readNestedArray(response, 'cart', 'items') ??
      this.readNestedArray(response, 'cart', 'cartItems') ??
      [];

    return rawItems
      .map((item) => this.toCartItem(item))
      .filter((item): item is CartApiItem => item !== null);
  }

  private toCartItem(value: unknown): CartApiItem | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const line = value as CartLineRecord;
    const productRecord = this.asProductRecord(line.product);
    const productIdRecord = this.asProductRecord(line.productId);
    const lineRecord = this.asProductRecord(line);
    const productCandidate = productRecord ?? productIdRecord ?? lineRecord;
    const detailProductId =
      (productRecord ? getProductId(productRecord) : null) ??
      (productIdRecord ? getProductId(productIdRecord) : null) ??
      (typeof line.product === 'string' ? line.product : null) ??
      (typeof line.productId === 'string' ? line.productId : null);
    const id =
      line.id ??
      line._id ??
      detailProductId;

    if (!id) {
      return null;
    }

    const image =
      line.image ??
      line.primaryImage ??
      (productCandidate ? getPrimaryImageUrl(productCandidate) : '') ??
      (line.images ? buildMediaUrl(Array.isArray(line.images) ? line.images[0] : line.images) : '');

    return {
      id: String(id),
      detailProductId: detailProductId ? String(detailProductId) : String(id),
      name: productCandidate?.name ?? line.name,
      price: line.price ?? productCandidate?.price ?? 0,
      description: line.description ?? productCandidate?.description,
      image: image || undefined,
      quantity: Math.max(1, Math.floor(line.quantity ?? line.qty ?? line.count ?? 1)),
      detailFolder:
        line.detailFolder ??
        (productCandidate && 'detailFolder' in productCandidate ? productCandidate.detailFolder : undefined) ??
        (productCandidate && 'folder' in productCandidate ? productCandidate.folder : undefined),
    };
  }

  private asProductRecord(value: unknown): (ApiProductRecord & { detailFolder?: string; folder?: string }) | null {
    return value && typeof value === 'object' ? (value as ApiProductRecord & { detailFolder?: string; folder?: string }) : null;
  }

  private readArray(value: unknown, key: string): unknown[] | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = (value as Record<string, unknown>)[key];
    return Array.isArray(candidate) ? candidate : null;
  }

  private readNestedArray(value: unknown, parentKey: string, childKey: string): unknown[] | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const parent = (value as Record<string, unknown>)[parentKey];

    if (!parent || typeof parent !== 'object') {
      return null;
    }

    const child = (parent as Record<string, unknown>)[childKey];
    return Array.isArray(child) ? child : null;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message;

      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }

      if (error.status === 401) {
        return 'Sign in to add products to your cart.';
      }

      if (error.status === 404) {
        return 'Cart service is unavailable right now.';
      }
    }

    return 'We could not add this product to your cart right now.';
  }
}
