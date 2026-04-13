import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import type { Product } from './products.service';

describe('CartService', () => {
  const storageKey = 'veloura-cart-items';
  const product: Product = {
    id: 101,
    name: 'Promise Bag',
    price: 250,
    description: 'Promise bag with structured silhouette.',
    image: 'https://example.com/promise-bag.png',
    detailFolder: 'promise-bags',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
  });

  it('adds items to the cart and persists them to localStorage', () => {
    TestBed.configureTestingModule({
      providers: [CartService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

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

    TestBed.configureTestingModule({
      providers: [CartService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const service = TestBed.inject(CartService);

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].name).toBe('Promise Bag');
    expect(service.items()[0].quantity).toBe(3);
    expect(service.total()).toBe(750);
  });
});
