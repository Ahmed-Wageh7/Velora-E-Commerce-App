import { PLATFORM_ID, Injectable, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { CartApiItem, CartApiService } from './cart-api.service';
import { CollectionProduct, CollectionProductsService } from './collection-products.service';
import { Product, ProductsService } from './products.service';
import { ToastService } from './toast.service';

export interface CartItem extends Product {
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cartApiService = inject(CartApiService);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly productsService = inject(ProductsService);
  private readonly toastService = inject(ToastService);
  private readonly storageKey = 'veloura-cart-items';
  private readonly cartItems = signal<CartItem[]>([]);

  readonly items = this.cartItems.asReadonly();
  readonly total = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreCart();

      effect(() => {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.cartItems()));
      });

      effect(() => {
        if (this.authService.isAuthenticated()) {
          void this.syncCartFromApi();
        }
      });
    }
  }

  addToCart(product: Product, quantity = 1): void {
    const normalizedQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;

    this.cartItems.update((items) => {
      const existingItem = items.find((item) => item.id === product.id);

      if (!existingItem) {
        return [
          ...items,
          {
            ...product,
            detailProductId: product.detailProductId ?? product.id,
            detailFolder: product.detailFolder ?? this.inferDetailFolder(product),
            quantity: normalizedQuantity,
          },
        ];
      }

      return items.map((item) =>
        item.id === product.id
          ? {
              ...item,
              detailProductId: item.detailProductId ?? product.detailProductId ?? product.id,
              detailFolder: item.detailFolder ?? product.detailFolder ?? this.inferDetailFolder(product),
              quantity: item.quantity + normalizedQuantity,
            }
          : item,
      );
    });
  }

  incrementQuantity(productId: string): void {
    this.cartItems.update((items) =>
      items.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }

  decrementQuantity(productId: string): void {
    this.cartItems.update((items) =>
      items
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  removeItem(productId: string): void {
    this.cartItems.update((items) => items.filter((item) => item.id !== productId));
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  async setItems(items: CartApiItem[]): Promise<void> {
    const enrichedItems = await this.enrichCartItems(items);
    this.cartItems.set(enrichedItems.map((item) => this.hydrateCartItem(item)));
  }

  async addToCartWithApi(product: Product, quantity = 1): Promise<boolean> {
    if (!this.ensureAuthenticated('Sign in to add this product to your cart.')) {
      return false;
    }

    const result = await this.cartApiService.addToCart({
      productId: product.id,
      quantity,
    });

    if (!result.ok) {
      this.toastService.show('Could not add product', result.error, 'error', 2000);
      return false;
    }

    this.addToCart(product, quantity);
    void this.syncCartFromApi();
    return true;
  }

  async syncCartFromApi(showError = false): Promise<boolean> {
    if (!this.authService.isAuthenticated()) {
      return false;
    }

    const result = await this.cartApiService.getCart();

    if (!result.ok) {
      if (showError) {
        this.toastService.show('Could not load cart', result.error, 'error', 2000);
      }

      return false;
    }

    if (result.items.length > 0 || this.cartItems().length === 0) {
      await this.setItems(result.items);
    }

    return true;
  }

  async removeItemWithApi(productId: string): Promise<boolean> {
    if (!this.ensureAuthenticated('Sign in to manage your cart.')) {
      return false;
    }

    this.removeItem(productId);

    const result = await this.cartApiService.removeItem(productId);

    if (!result.ok) {
      this.toastService.show('Could not remove product', result.error, 'error', 2000);
      void this.syncCartFromApi(true);
      return false;
    }

    void this.syncCartFromApi();
    return true;
  }

  private restoreCart(): void {
    try {
      const savedCart = window.localStorage.getItem(this.storageKey);

      if (!savedCart) {
        return;
      }

      const parsedCart = JSON.parse(savedCart);

      if (!Array.isArray(parsedCart)) {
        return;
      }

      const validItems = parsedCart
        .filter((item): item is CartItem => this.isCartItem(item))
        .map((item) => this.hydrateCartItem(item));
      this.cartItems.set(validItems);
    } catch {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  private hydrateCartItem(item: CartItem): CartItem {
    return {
      ...item,
      detailProductId: item.detailProductId ?? item.id,
      detailFolder: item.detailFolder ?? this.inferDetailFolder(item),
    };
  }

  private inferDetailFolder(item: Pick<Product, 'image' | 'description' | 'detailFolder'>): string | undefined {
    if (item.detailFolder) {
      return item.detailFolder;
    }

    const folderFromImage = item.image.match(/\/object\/public\/[^/]+\/([^/?#]+)\//)?.[1];

    if (folderFromImage) {
      return folderFromImage;
    }

    const description = item.description.toLowerCase();

    if (description.includes('fragrance')) {
      return 'fragrances';
    }

    if (description.includes('care product')) {
      return 'care';
    }

    if (description.includes('frankel')) {
      return 'category-frankel';
    }

    if (description.includes('pink collection')) {
      return 'pink-collection';
    }

    if (description.includes('arrogate')) {
      return 'Arrogate-collection';
    }

    if (description.includes('topaco')) {
      return 'category-topaco';
    }

    if (description.includes('promise bag')) {
      return 'promise-bags';
    }

    if (description.includes('art of dedication')) {
      return 'The-Art-Dedication';
    }

    return undefined;
  }

  private isCartItem(value: unknown): value is CartItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const item = value as Partial<CartItem>;

    return (
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.image === 'string' &&
      typeof item.price === 'number' &&
      (typeof item.detailFolder === 'undefined' || typeof item.detailFolder === 'string') &&
      (typeof item.detailProductId === 'undefined' || typeof item.detailProductId === 'string') &&
      typeof item.quantity === 'number' &&
      item.quantity > 0
    );
  }

  private ensureAuthenticated(message: string): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    this.toastService.show('Sign in required', message, 'error', 1800);
    void this.router.navigate(['/auth/signin']);
    return false;
  }

  private async enrichCartItems(items: CartApiItem[]): Promise<CartItem[]> {
    if (!items.length) {
      return [];
    }

    const existingItems = this.cartItems();

    try {
      const products = await firstValueFrom(this.productsService.getProducts());
      const productsById = new Map(products.map((product) => [product.id, product] as const));
      const collectionCache = new Map<string, CollectionProduct[]>();

      return Promise.all(items.map(async (item) => {
        const detailFolder = item.detailFolder ?? this.inferDetailFolder({
          image: item.image ?? '',
          description: item.description ?? item.name ?? 'Product',
          detailFolder: item.detailFolder,
        });
        const product =
          productsById.get(item.id) ??
          (detailFolder ? await this.findCollectionProduct(detailFolder, item, collectionCache) : undefined);
        const existingItem = this.findExistingCartMatch(existingItems, item, detailFolder);
        const productImage =
          product
            ? (this.isCatalogProduct(product) ? product.image : product.primaryImageUrl)
            : undefined;
        const productPrimaryImage =
          product
            ? (this.isCatalogProduct(product) ? product.primaryImage : product.primaryImageUrl)
            : undefined;
        const productCoverImage =
          product
            ? (this.isCatalogProduct(product) ? product.coverImage : undefined)
            : undefined;
        const productCornerImage =
          product
            ? (this.isCatalogProduct(product) ? product.cornerImage : undefined)
            : undefined;
        const productConerImage =
          product
            ? (this.isCatalogProduct(product) ? product.conerImage : undefined)
            : undefined;
        const productImages =
          product && this.isCatalogProduct(product) ? product.images : undefined;
        const productDetailFolder = product && this.isCatalogProduct(product) ? product.detailFolder : undefined;

        return {
          id: item.id,
          detailProductId: existingItem?.detailProductId ?? product?.id ?? item.detailProductId ?? item.id,
          name: item.name ?? product?.name ?? 'Product',
          price: item.price ?? product?.price ?? 0,
          originalPrice: product?.originalPrice,
          quantity: item.quantity,
          description: item.description ?? item.name ?? product?.name ?? 'Product',
          image: item.image ?? productImage ?? '',
          images: productImages,
          primaryImage: productPrimaryImage ?? item.image ?? productImage ?? '',
          coverImage: productCoverImage,
          cornerImage: productCornerImage,
          conerImage: productConerImage,
          detailFolder: detailFolder ?? productDetailFolder ?? this.inferDetailFolder({
            image: item.image ?? productImage ?? '',
            description: item.description ?? item.name ?? product?.name ?? 'Product',
            detailFolder: productDetailFolder,
          }),
        };
      }));
    } catch {
      return items.map((item) => {
        const detailFolder = item.detailFolder ?? this.inferDetailFolder({
          image: item.image ?? '',
          description: item.description ?? item.name ?? 'Product',
          detailFolder: item.detailFolder,
        });
        const existingItem = this.findExistingCartMatch(existingItems, item, detailFolder);

        return {
          id: item.id,
          detailProductId: existingItem?.detailProductId ?? item.detailProductId ?? item.id,
          name: item.name ?? existingItem?.name ?? 'Product',
          price: item.price,
          quantity: item.quantity,
          description: item.description ?? existingItem?.description ?? item.name ?? 'Product',
          image: item.image ?? existingItem?.image ?? '',
          primaryImage: item.image ?? existingItem?.primaryImage ?? existingItem?.image ?? '',
          detailFolder: detailFolder ?? existingItem?.detailFolder,
        };
      });
    }
  }

  private async findCollectionProduct(
    detailFolder: string,
    item: CartApiItem,
    collectionCache: Map<string, CollectionProduct[]>,
  ): Promise<CollectionProduct | undefined> {
    const folder = detailFolder.replace(/^\/|\/$/g, '');

    if (!collectionCache.has(folder)) {
      const products = await firstValueFrom(
        this.collectionProductsService.getCollectionProductsWithOptions(folder, {
          includeDeleted: true,
          fetchAllPages: true,
        }),
      );
      collectionCache.set(folder, products);
    }

    const products = collectionCache.get(folder) ?? [];
    const normalizedName = this.normalizeLookup(item.name);
    const normalizedImage = this.normalizeLookup(item.image);

    return products.find((product) => {
      const sameName = normalizedName && this.normalizeLookup(product.name) === normalizedName;
      const sameImage =
        normalizedImage &&
        [product.primaryImageUrl, product.hoverImageUrl, product.coverImageUrl]
          .map((value) => this.normalizeLookup(value))
          .includes(normalizedImage);

      return Boolean(sameName || sameImage);
    });
  }

  private normalizeLookup(value: string | undefined): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/+/, '');
  }

  private isCatalogProduct(product: Product | CollectionProduct): product is Product {
    return 'image' in product;
  }

  private findExistingCartMatch(
    existingItems: CartItem[],
    item: CartApiItem,
    detailFolder: string | undefined,
  ): CartItem | undefined {
    const normalizedName = this.normalizeLookup(item.name);
    const normalizedImage = this.normalizeLookup(item.image);

    return existingItems.find((existingItem) => {
      const sameFolder =
        !detailFolder ||
        !existingItem.detailFolder ||
        existingItem.detailFolder === detailFolder;
      const sameName = normalizedName && this.normalizeLookup(existingItem.name) === normalizedName;
      const sameImage = normalizedImage && this.normalizeLookup(existingItem.image) === normalizedImage;

      return sameFolder && Boolean(sameName || sameImage);
    });
  }
}
