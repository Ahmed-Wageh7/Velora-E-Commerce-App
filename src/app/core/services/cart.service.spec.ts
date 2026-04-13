import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { CartApiItem, CartApiService } from './cart-api.service';
import { CartService } from './cart.service';
import { CollectionProductsService } from './collection-products.service';
import { ProductsService, type Product } from './products.service';
import { ToastService } from './toast.service';

describe('CartService', () => {
  const storageKey = 'veloura-cart-items';
  const product: Product = {
    id: '101',
    name: 'Promise Bag',
    price: 250,
    description: 'Promise bag with structured silhouette.',
    image: 'https://example.com/promise-bag.png',
    detailFolder: 'promise-bags',
  };

  const authState = signal(false);
  const authServiceStub = {
    isAuthenticated: authState.asReadonly(),
  };
  const cartApiServiceStub = {
    addToCart: vi.fn(),
    getCart: vi.fn(),
    removeItem: vi.fn(),
  };
  const collectionProductsServiceStub = {
    getProductsBySubcategoryId: vi.fn(),
    getCollectionProductsWithOptions: vi.fn(),
  };
  const productsServiceStub = {
    getProducts: vi.fn(),
  };
  const toastServiceStub = {
    show: vi.fn(),
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    authState.set(false);
    cartApiServiceStub.addToCart.mockReset();
    cartApiServiceStub.getCart.mockReset();
    cartApiServiceStub.removeItem.mockReset();
    collectionProductsServiceStub.getCollectionProductsWithOptions.mockReset();
    collectionProductsServiceStub.getProductsBySubcategoryId.mockReset();
    productsServiceStub.getProducts.mockReset();
    toastServiceStub.show.mockReset();
    collectionProductsServiceStub.getCollectionProductsWithOptions.mockReturnValue(of([]));
    collectionProductsServiceStub.getProductsBySubcategoryId.mockReturnValue(of([]));
    productsServiceStub.getProducts.mockReturnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        CartService,
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authServiceStub },
        { provide: CartApiService, useValue: cartApiServiceStub },
        { provide: CollectionProductsService, useValue: collectionProductsServiceStub },
        { provide: ProductsService, useValue: productsServiceStub },
        { provide: ToastService, useValue: toastServiceStub },
      ],
    });
  });

  it('adds items to the cart and persists them to localStorage', () => {
    const service = TestBed.inject(CartService);

    service.addToCart(product);
    service.addToCart(product);
    TestBed.flushEffects();

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].quantity).toBe(2);
    expect(service.total()).toBe(500);

    const savedCart = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    expect(savedCart).toHaveLength(1);
    expect(savedCart[0].quantity).toBe(2);
    expect(savedCart[0].detailFolder).toBe('promise-bags');
  });

  it('restores valid cart items from localStorage on startup', () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          ...product,
          quantity: 3,
        },
      ]),
    );

    const service = TestBed.inject(CartService);

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].name).toBe('Promise Bag');
    expect(service.items()[0].quantity).toBe(3);
    expect(service.total()).toBe(750);
  });

  it('prefers deleting cart items by product id when both identifiers exist', async () => {
    authState.set(true);
    const service = TestBed.inject(CartService);

    cartApiServiceStub.getCart.mockResolvedValue({
      ok: true,
      items: [
        {
          id: 'line-1',
          detailProductId: 'product-1',
          name: product.name,
          price: product.price,
          description: product.description,
          image: product.image,
          quantity: 1,
          detailFolder: product.detailFolder,
        },
      ],
    });

    await service.syncCartFromApi();

    cartApiServiceStub.removeItem.mockResolvedValue({ ok: true });

    const removed = await service.removeItemWithApi({
      id: 'line-1',
      detailProductId: 'product-1',
    });

    expect(removed).toBe(true);
    expect(cartApiServiceStub.removeItem).toHaveBeenCalledWith('product-1');
    expect(cartApiServiceStub.removeItem).not.toHaveBeenCalledWith('line-1');
    expect(service.items()).toEqual([]);
  });

  it('falls back to the cart line id when deleting by product id fails', async () => {
    authState.set(true);
    const service = TestBed.inject(CartService);
    const originalServerItem: CartApiItem = {
      id: 'line-1',
      detailProductId: 'product-1',
      name: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
      quantity: 1,
      detailFolder: product.detailFolder,
    };

    cartApiServiceStub.getCart.mockResolvedValue({
      ok: true,
      items: [originalServerItem],
    });

    await service.syncCartFromApi();

    cartApiServiceStub.removeItem.mockImplementation(async (identifier: string) => {
      return identifier === 'line-1'
        ? { ok: true }
        : { ok: false, error: 'Could not remove with product id.' };
    });

    const removed = await service.removeItemWithApi({
      id: 'line-1',
      detailProductId: 'product-1',
    });

    expect(removed).toBe(true);
    expect(cartApiServiceStub.removeItem.mock.calls).toEqual([['product-1'], ['line-1']]);
    expect(service.items()).toEqual([]);
  });

  it('prefers the api product id over stale local cart ids when hydrating items', async () => {
    authState.set(true);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          ...product,
          id: 'stale-line-id',
          detailProductId: 'stale-line-id',
          quantity: 1,
        },
      ]),
    );

    const service = TestBed.inject(CartService);

    cartApiServiceStub.getCart.mockResolvedValue({
      ok: true,
      items: [
        {
          id: 'cart-line-1',
          detailProductId: 'real-product-1',
          name: product.name,
          price: product.price,
          description: product.description,
          image: product.image,
          quantity: 1,
          detailFolder: product.detailFolder,
        },
      ],
    });

    await service.syncCartFromApi();

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].id).toBe('cart-line-1');
    expect(service.items()[0].detailProductId).toBe('real-product-1');
  });

  it('preserves an existing local detail product id when the api cart returns a stale one', async () => {
    authState.set(true);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          ...product,
          id: 'local-line-1',
          detailProductId: 'real-product-1',
          detailFolder: 'Arrogate-collection',
          quantity: 1,
        },
      ]),
    );

    const service = TestBed.inject(CartService);

    cartApiServiceStub.getCart.mockResolvedValue({
      ok: true,
      items: [
        {
          id: 'server-line-1',
          detailProductId: 'stale-server-id',
          name: product.name,
          price: product.price,
          description: product.description,
          image: product.image,
          quantity: 1,
          detailFolder: 'Arrogate-collection',
        },
      ],
    });

    await service.syncCartFromApi();

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].id).toBe('server-line-1');
    expect(service.items()[0].detailProductId).toBe('real-product-1');
  });

  it('prefers collection matches over generic catalog id matches when hydrating special collection items', async () => {
    authState.set(true);
    const service = TestBed.inject(CartService);

    productsServiceStub.getProducts.mockReturnValue(
      of([
        {
          id: 'stale-server-id',
          name: 'Wrong Product',
          price: 999,
          description: 'Wrong product',
          image: 'https://example.com/wrong-product.png',
          detailFolder: 'catalog',
        },
      ]),
    );

    collectionProductsServiceStub.getProductsBySubcategoryId.mockReturnValue(
      of([
        {
          id: 'real-promise-product',
          name: product.name,
          price: product.price,
          originalPrice: product.price,
          quantity: 1,
          isDeleted: false,
          primaryImageUrl: product.image,
          hoverImageUrl: product.image,
          primaryImageAlt: product.name,
          hoverImageAlt: `${product.name} detail view`,
        },
      ]),
    );

    cartApiServiceStub.getCart.mockResolvedValue({
      ok: true,
      items: [
        {
          id: 'server-line-1',
          detailProductId: 'stale-server-id',
          name: product.name,
          price: product.price,
          description: product.description,
          image: product.image,
          quantity: 1,
          detailFolder: 'promise-bags',
        },
      ],
    });

    await service.syncCartFromApi();

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].detailProductId).toBe('real-promise-product');
  });

  it('preserves the existing detail folder when the synced cart item does not include one', async () => {
    authState.set(true);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          ...product,
          id: 'local-line-1',
          detailProductId: 'real-product-1',
          detailFolder: 'promise-bags',
          quantity: 1,
        },
      ]),
    );

    const service = TestBed.inject(CartService);

    cartApiServiceStub.getCart.mockResolvedValue({
      ok: true,
      items: [
        {
          id: 'server-line-1',
          detailProductId: 'real-product-1',
          name: product.name,
          price: product.price,
          description: '',
          image: product.image,
          quantity: 1,
        },
      ],
    });

    await service.syncCartFromApi();

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].detailFolder).toBe('promise-bags');
  });
});
