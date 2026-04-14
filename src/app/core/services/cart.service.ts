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

type CartItemIdentifier = Pick<CartItem, 'id' | 'detailProductId'>;

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
  private readonly legacyStorageKey = this.storageKey;
  private readonly guestStorageScope = 'guest';
  private readonly specialCollectionSubcategoryIds: Record<string, string> = {
    'Arrogate-collection': '69d50edf9e39253830600b30',
    'category-frankel': '69d506d49e39253830600ace',
    'promise-bags': '69d4fe299e39253830600a70',
  };
  private readonly cartItems = signal<CartItem[]>([]);
  private activeStorageKey = '';

  readonly items = this.cartItems.asReadonly();
  readonly total = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreScopedCart();

      effect(() => {
        this.restoreScopedCart();

        if (this.authService.isAuthenticated()) {
          void this.syncCartFromApi(false, true);
        }
      });

      effect(() => {
        const storageKey = this.activeStorageKey;

        if (!storageKey) {
          return;
        }

        window.localStorage.setItem(storageKey, JSON.stringify(this.cartItems()));
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
    this.removeItemByIdentifiers([productId]);
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

  async syncCartFromApi(showError = false, forceSync = false): Promise<boolean> {
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

    if (forceSync || result.items.length > 0 || this.cartItems().length === 0) {
      await this.setItems(result.items);
    }

    return true;
  }

  async removeItemWithApi(item: CartItemIdentifier | string): Promise<boolean> {
    if (!this.ensureAuthenticated('Sign in to manage your cart.')) {
      return false;
    }

    const previousItems = this.cartItems();

    this.removeItemByIdentifiers(this.getCartItemIdentifiers(item));
    const result = await this.removeCartLineFromApi(item);

    if (result.ok) {
      return true;
    }

    this.cartItems.set(previousItems);
    this.toastService.show(
      'Could not remove product',
      result.error,
      'error',
      2000,
    );
    return false;
  }

  async updateQuantityWithApi(item: CartItem, quantity: number): Promise<boolean> {
    if (!this.ensureAuthenticated('Sign in to manage your cart.')) {
      return false;
    }

    const normalizedQuantity = Number.isFinite(quantity)
      ? Math.max(0, Math.floor(quantity))
      : item.quantity;
    const currentQuantity = Math.max(1, Math.floor(item.quantity));
    const productId = this.resolveCartProductId(item);

    if (!productId) {
      this.toastService.show(
        'Could not update cart',
        'The cart item is missing its product identifier.',
        'error',
        2000,
      );
      return false;
    }

    if (normalizedQuantity === currentQuantity) {
      return true;
    }

    if (normalizedQuantity > currentQuantity) {
      const result = await this.cartApiService.addToCart({
        productId,
        quantity: normalizedQuantity - currentQuantity,
      });

      if (!result.ok) {
        this.toastService.show('Could not update cart', result.error, 'error', 2000);
        return false;
      }

      return this.syncCartFromApi(true, true);
    }

    const removeResult = await this.removeCartLineFromApi(item);

    if (!removeResult.ok) {
      this.toastService.show('Could not update cart', removeResult.error, 'error', 2000);
      return false;
    }

    if (normalizedQuantity === 0) {
      return this.syncCartFromApi(true, true);
    }

    const addResult = await this.cartApiService.addToCart({
      productId,
      quantity: normalizedQuantity,
    });

    if (!addResult.ok) {
      await this.cartApiService.addToCart({
        productId,
        quantity: currentQuantity,
      });
      await this.syncCartFromApi(true, true);
      this.toastService.show('Could not update cart', addResult.error, 'error', 2000);
      return false;
    }

    return this.syncCartFromApi(true, true);
  }

  private restoreScopedCart(): void {
    const storageKey = this.getScopedStorageKey();

    if (storageKey === this.activeStorageKey) {
      return;
    }

    this.activeStorageKey = storageKey;
    this.restoreCart(storageKey);
  }

  private restoreCart(storageKey: string): void {
    try {
      const savedCart = this.readSavedCart(storageKey);

      if (!savedCart) {
        this.cartItems.set([]);
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
      window.localStorage.removeItem(storageKey);
      this.cartItems.set([]);
    }
  }

  private readSavedCart(storageKey: string): string | null {
    const savedCart = window.localStorage.getItem(storageKey);

    if (savedCart) {
      return savedCart;
    }

    const legacyCart = window.localStorage.getItem(this.legacyStorageKey);

    if (!legacyCart) {
      return null;
    }

    window.localStorage.setItem(storageKey, legacyCart);
    window.localStorage.removeItem(this.legacyStorageKey);
    return legacyCart;
  }

  private getScopedStorageKey(): string {
    const user = this.authService.currentUser?.();
    const scope = user?.id?.trim() || user?.email?.trim().toLowerCase() || this.guestStorageScope;

    return `${this.storageKey}:${scope}`;
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

  private getCartItemIdentifiers(item: CartItemIdentifier | string): string[] {
    const identifiers =
      typeof item === 'string'
        ? [item]
        : [item.detailProductId, item.id].filter((value): value is string => typeof value === 'string');

    return [...new Set(identifiers.map((value) => value.trim()).filter(Boolean))];
  }

  private removeItemByIdentifiers(identifiers: string[]): void {
    this.cartItems.update((items) =>
      items.filter((item) => !identifiers.some((identifier) => this.matchesCartIdentifier(item, identifier))),
    );
  }

  private matchesCartIdentifier(item: CartItem, identifier: string): boolean {
    return item.id === identifier || item.detailProductId === identifier;
  }

  private resolveCartProductId(item: CartItemIdentifier): string | null {
    const detailProductId = item.detailProductId?.trim();
    const cartLineId = item.id.trim();

    if (detailProductId && detailProductId !== cartLineId) {
      return detailProductId;
    }

    return detailProductId ?? cartLineId ?? null;
  }

  private async removeCartLineFromApi(
    item: CartItemIdentifier | string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const identifiers = this.getCartItemIdentifiers(item);
    let lastError: string | null = null;

    for (const identifier of identifiers) {
      const result = await this.cartApiService.removeItem(identifier);

      if (!result.ok) {
        lastError = result.error;
        continue;
      }

      return { ok: true };
    }

    return {
      ok: false,
      error: lastError ?? 'The cart item could not be removed right now.',
    };
  }

  private resolveDetailProductId(
    item: CartApiItem,
    existingItem?: CartItem,
    product?: Product | CollectionProduct,
  ): string {
    if (product?.id) {
      return product.id;
    }

    const existingDetailProductId = existingItem?.detailProductId?.trim();
    const itemDetailProductId = item.detailProductId?.trim();
    const existingLooksLikeProductId =
      Boolean(existingDetailProductId) && existingDetailProductId !== existingItem?.id;
    const itemLooksLikeProductId =
      Boolean(itemDetailProductId) && itemDetailProductId !== item.id;

    if (existingLooksLikeProductId) {
      return existingDetailProductId!;
    }

    if (itemLooksLikeProductId) {
      return itemDetailProductId!;
    }

    return existingDetailProductId ?? itemDetailProductId ?? item.id;
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
        const candidateProductId = item.detailProductId ?? item.id;
        const detailFolder = item.detailFolder ?? this.inferDetailFolder({
          image: item.image ?? '',
          description: item.description ?? item.name ?? 'Product',
          detailFolder: item.detailFolder,
        });
        const collectionProduct =
          detailFolder ? await this.findCollectionProduct(detailFolder, item, collectionCache) : undefined;
        const product =
          collectionProduct ??
          productsById.get(candidateProductId) ??
          productsById.get(item.id);
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
          detailProductId: this.resolveDetailProductId(item, existingItem, product),
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
          detailFolder:
            detailFolder ??
            productDetailFolder ??
            existingItem?.detailFolder ??
            this.inferDetailFolder({
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
          detailProductId: this.resolveDetailProductId(item, existingItem),
          name: item.name ?? existingItem?.name ?? 'Product',
          price: item.price,
          quantity: item.quantity,
          description: item.description ?? existingItem?.description ?? item.name ?? 'Product',
          image: item.image ?? existingItem?.image ?? '',
          primaryImage: item.image ?? existingItem?.primaryImage ?? existingItem?.image ?? '',
          detailFolder:
            detailFolder ??
            existingItem?.detailFolder ??
            this.inferDetailFolder({
              image: item.image ?? existingItem?.image ?? '',
              description: item.description ?? existingItem?.description ?? item.name ?? 'Product',
              detailFolder: item.detailFolder,
            }),
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
      const subcategoryId = this.specialCollectionSubcategoryIds[folder];
      const products = await firstValueFrom(
        subcategoryId
          ? this.collectionProductsService.getProductsBySubcategoryId(subcategoryId, true, {
              includeDeleted: true,
            })
          : this.collectionProductsService.getCollectionProductsWithOptions(folder, {
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
