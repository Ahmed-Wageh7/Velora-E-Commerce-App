import { PLATFORM_ID, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { vi } from "vitest";
import { AuthApiService } from "../auth/auth-api.service";
import { AuthService } from "../auth/auth.service";
import { ToastService } from "../notifications/toast.service";
import { CartApiItem } from "../../models/cart/cart.model";
import { Product } from "../../models/product/product.model";
import { CartApiService } from "./cart-api.service";
import { CartService } from "./cart.service";

describe("CartService", () => {
  const product: Product = {
    id: "product-101",
    name: "Promise Bag",
    price: 250,
    description: "Promise bag with structured silhouette.",
    image: "https://example.com/promise-bag.png",
    detailFolder: "promise-bags",
  };

  const apiItems: CartApiItem[] = [
    {
      cartItemId: "cart-line-1",
      productId: "product-101",
      name: "Promise Bag",
      description: "Structured promise bag.",
      price: 250,
      image: "https://example.com/promise-bag.png",
      coverImage: "https://example.com/promise-cover.png",
      images: [
        "https://example.com/promise-bag.png",
        "https://example.com/promise-side.png",
      ],
      quantity: 2,
      detailFolder: "promise-bags",
    },
    {
      cartItemId: "cart-line-2",
      productId: "product-202",
      name: "Aura Watch",
      price: 400,
      image: "https://example.com/aura-watch.png",
      coverImage: null,
      images: [],
      quantity: 1,
    },
  ];

  const authState = signal(false);
  const authServiceStub = {
    isAuthenticated: authState.asReadonly(),
    waitForInitialization: vi.fn<() => Promise<void>>(),
  };
  const cartApiServiceStub = {
    addToCart:
      vi.fn<
        (
          productId: string,
          quantity: number,
        ) => Promise<{ ok: true } | { ok: false; error: string }>
      >(),
    getCart:
      vi.fn<
        () => Promise<
          { ok: true; items: CartApiItem[] } | { ok: false; error: string }
        >
      >(),
    removeItem:
      vi.fn<
        (
          productId: string,
        ) => Promise<{ ok: true } | { ok: false; error: string }>
      >(),
    updateItem:
      vi.fn<
        (
          productId: string,
          quantity: number,
        ) => Promise<{ ok: true } | { ok: false; error: string }>
      >(),
  };
  const routerStub = {
    navigate: vi.fn<(...args: unknown[]) => Promise<boolean>>(),
  };
  const toastServiceStub = {
    show: vi.fn(),
  };

  beforeEach(() => {
    authState.set(false);
    authServiceStub.waitForInitialization.mockReset();
    authServiceStub.waitForInitialization.mockResolvedValue(undefined);
    cartApiServiceStub.addToCart.mockReset();
    cartApiServiceStub.getCart.mockReset();
    cartApiServiceStub.removeItem.mockReset();
    cartApiServiceStub.updateItem.mockReset();
    routerStub.navigate.mockReset();
    routerStub.navigate.mockResolvedValue(true);
    toastServiceStub.show.mockReset();
    cartApiServiceStub.addToCart.mockResolvedValue({ ok: true });
    cartApiServiceStub.getCart.mockResolvedValue({ ok: true, items: [] });
    cartApiServiceStub.removeItem.mockResolvedValue({ ok: true });
    cartApiServiceStub.updateItem.mockResolvedValue({ ok: true });
  });

  describe("initialization", () => {
    it("loads the cart when authentication becomes true", async () => {
      const service = setup({ platformId: "browser" });

      expect(service.items()).toEqual([]);
      expect(cartApiServiceStub.getCart).not.toHaveBeenCalled();

      cartApiServiceStub.getCart.mockResolvedValue({
        ok: true,
        items: apiItems,
      });
      authState.set(true);
      TestBed.flushEffects();
      await flushPromises();

      expect(cartApiServiceStub.getCart).toHaveBeenCalled();
      expect(service.items()).toEqual([
        {
          id: "cart-line-1",
          productId: "product-101",
          detailProductId: "product-101",
          name: "Promise Bag",
          description: "Structured promise bag.",
          price: 250,
          image: "https://example.com/promise-bag.png",
          coverImage: "https://example.com/promise-cover.png",
          images: [
            "https://example.com/promise-bag.png",
            "https://example.com/promise-side.png",
          ],
          quantity: 2,
          detailFolder: "promise-bags",
        },
        {
          id: "cart-line-2",
          productId: "product-202",
          detailProductId: "product-202",
          name: "Aura Watch",
          description: "Aura Watch",
          price: 400,
          image: "https://example.com/aura-watch.png",
          coverImage: null,
          images: [],
          quantity: 1,
          detailFolder: undefined,
        },
      ]);
    });

    it("clears the in-memory cart state when unauthenticated", async () => {
      authState.set(true);
      cartApiServiceStub.getCart.mockResolvedValue({
        ok: true,
        items: apiItems,
      });

      const service = setup({ platformId: "browser" });
      TestBed.flushEffects();
      await flushPromises();

      expect(service.items()).toHaveLength(2);

      authState.set(false);
      TestBed.flushEffects();

      expect(service.items()).toEqual([]);
    });

    it("does not load the cart while unauthenticated", async () => {
      setup({ platformId: "browser" });
      TestBed.flushEffects();
      await flushPromises();

      expect(cartApiServiceStub.getCart).not.toHaveBeenCalled();
    });
  });

  describe("loadCart", () => {
    it("waits for AuthService initialization before calling the API", async () => {
      authState.set(true);
      const deferred = createDeferred<void>();
      authServiceStub.waitForInitialization.mockReturnValue(deferred.promise);
      const service = setup();

      const result = service.loadCart();
      await flushPromises();

      expect(authServiceStub.waitForInitialization).toHaveBeenCalled();
      expect(cartApiServiceStub.getCart).not.toHaveBeenCalled();

      deferred.resolve();

      await expect(result).resolves.toBe(true);
      expect(cartApiServiceStub.getCart).toHaveBeenCalled();
    });

    it("calls CartApiService.getCart, maps API items, updates items, and calculates total", async () => {
      authState.set(true);
      cartApiServiceStub.getCart.mockResolvedValue({
        ok: true,
        items: apiItems,
      });
      const service = setup();

      await expect(service.loadCart()).resolves.toBe(true);

      expect(cartApiServiceStub.getCart).toHaveBeenCalledOnce();
      expect(service.items()[0]).toMatchObject({
        id: "cart-line-1",
        productId: "product-101",
        detailProductId: "product-101",
        description: "Structured promise bag.",
        quantity: 2,
      });
      expect(service.items()[1]).toMatchObject({
        id: "cart-line-2",
        productId: "product-202",
        description: "Aura Watch",
        quantity: 1,
      });
      expect(service.total()).toBe(900);
    });

    it("returns false and does not call the API when unauthenticated", async () => {
      const service = setup();

      await expect(service.loadCart()).resolves.toBe(false);

      expect(cartApiServiceStub.getCart).not.toHaveBeenCalled();
      expect(service.items()).toEqual([]);
    });

    it("returns false and shows a toast when the API load fails", async () => {
      authState.set(true);
      cartApiServiceStub.getCart.mockResolvedValue({
        ok: false,
        error: "Backend is unavailable.",
      });
      const service = setup();

      await expect(service.loadCart()).resolves.toBe(false);

      expect(toastServiceStub.show).toHaveBeenCalledWith(
        "Could not load cart",
        "Backend is unavailable.",
        "error",
        2000,
      );
      expect(service.items()).toEqual([]);
    });
  });

  describe("addToCart", () => {
    it("waits for auth initialization before mutating the cart", async () => {
      authState.set(true);
      const deferred = createDeferred<void>();
      authServiceStub.waitForInitialization.mockReturnValue(deferred.promise);
      const service = setup();

      const result = service.addToCart(product, 3);
      await flushPromises();

      expect(authServiceStub.waitForInitialization).toHaveBeenCalled();
      expect(cartApiServiceStub.addToCart).not.toHaveBeenCalled();

      deferred.resolve();

      await expect(result).resolves.toBe(true);
      expect(cartApiServiceStub.addToCart).toHaveBeenCalledWith(
        "product-101",
        3,
      );
    });

    it("rejects unauthenticated users without calling the cart API", async () => {
      const service = setup();

      await expect(service.addToCart(product)).resolves.toBe(false);

      expect(cartApiServiceStub.addToCart).not.toHaveBeenCalled();
      expect(cartApiServiceStub.getCart).not.toHaveBeenCalled();
      expect(toastServiceStub.show).toHaveBeenCalledWith(
        "Sign in required",
        "Sign in to add products to your cart.",
        "error",
        1800,
      );
      expect(routerStub.navigate).toHaveBeenCalledWith(["/auth/signin"]);
    });

    it("calls CartApiService.addToCart and reloads after a successful mutation", async () => {
      authState.set(true);
      cartApiServiceStub.getCart.mockResolvedValue({
        ok: true,
        items: apiItems,
      });
      const service = setup();

      await expect(service.addToCart(product, 2)).resolves.toBe(true);

      expect(cartApiServiceStub.addToCart).toHaveBeenCalledWith(
        "product-101",
        2,
      );
      expect(cartApiServiceStub.getCart).toHaveBeenCalled();
      expect(service.items()).toHaveLength(2);
    });

    it("does not reload and shows a toast when the mutation fails", async () => {
      authState.set(true);
      cartApiServiceStub.addToCart.mockResolvedValue({
        ok: false,
        error: "Out of stock.",
      });
      const service = setup();

      await expect(service.addToCart(product, 2)).resolves.toBe(false);

      expect(cartApiServiceStub.getCart).not.toHaveBeenCalled();
      expect(toastServiceStub.show).toHaveBeenCalledWith(
        "Could not add product",
        "Out of stock.",
        "error",
        2000,
      );
    });
  });

  describe("updateQuantity", () => {
    it("rejects unauthenticated users", async () => {
      const service = setup();

      await expect(service.updateQuantity("product-101", 2)).resolves.toBe(
        false,
      );

      expect(cartApiServiceStub.updateItem).not.toHaveBeenCalled();
      expect(toastServiceStub.show).toHaveBeenCalledWith(
        "Sign in required",
        "Sign in to manage your cart.",
        "error",
        1800,
      );
    });

    it("calls CartApiService.updateItem and reloads after success", async () => {
      authState.set(true);
      cartApiServiceStub.getCart.mockResolvedValue({
        ok: true,
        items: apiItems,
      });
      const service = setup();

      await expect(service.updateQuantity("product-101", 4)).resolves.toBe(
        true,
      );

      expect(cartApiServiceStub.updateItem).toHaveBeenCalledWith(
        "product-101",
        4,
      );
      expect(cartApiServiceStub.getCart).toHaveBeenCalled();
      expect(service.items()).toHaveLength(2);
    });

    it("calls removeItem when quantity is zero or less", async () => {
      authState.set(true);
      const service = setup();
      const removeSpy = vi.spyOn(service, "removeItem").mockResolvedValue(true);

      await expect(service.updateQuantity("product-101", 0)).resolves.toBe(
        true,
      );

      expect(removeSpy).toHaveBeenCalledWith("product-101");
      expect(cartApiServiceStub.updateItem).not.toHaveBeenCalled();
    });

    it("does not reload and shows a toast when the update fails", async () => {
      authState.set(true);
      cartApiServiceStub.updateItem.mockResolvedValue({
        ok: false,
        error: "Invalid quantity.",
      });
      const service = setup();

      await expect(service.updateQuantity("product-101", 4)).resolves.toBe(
        false,
      );

      expect(cartApiServiceStub.getCart).not.toHaveBeenCalled();
      expect(toastServiceStub.show).toHaveBeenCalledWith(
        "Could not update cart",
        "Invalid quantity.",
        "error",
        2000,
      );
    });
  });

  describe("increment and decrement", () => {
    it("calculates the next quantity and delegates increment updates", async () => {
      authState.set(true);
      cartApiServiceStub.getCart.mockResolvedValue({
        ok: true,
        items: apiItems,
      });
      const service = setup();
      await service.loadCart();
      const updateSpy = vi
        .spyOn(service, "updateQuantity")
        .mockResolvedValue(true);

      await expect(service.increment("product-101")).resolves.toBe(true);

      expect(updateSpy).toHaveBeenCalledWith("product-101", 3);
    });

    it("calculates the next quantity and delegates decrement updates", async () => {
      authState.set(true);
      cartApiServiceStub.getCart.mockResolvedValue({
        ok: true,
        items: apiItems,
      });
      const service = setup();
      await service.loadCart();
      const updateSpy = vi
        .spyOn(service, "updateQuantity")
        .mockResolvedValue(true);

      await expect(service.decrement("product-101")).resolves.toBe(true);

      expect(updateSpy).toHaveBeenCalledWith("product-101", 1);
    });

    it("handles missing products safely", async () => {
      const service = setup();

      await expect(service.increment("missing-product")).resolves.toBe(false);
      await expect(service.decrement("missing-product")).resolves.toBe(false);

      expect(cartApiServiceStub.updateItem).not.toHaveBeenCalled();
    });
  });

  describe("removeItem", () => {
    it("calls CartApiService.removeItem and reloads after successful removal", async () => {
      authState.set(true);
      cartApiServiceStub.getCart.mockResolvedValue({
        ok: true,
        items: [],
      });
      const service = setup();

      await expect(service.removeItem("product-101")).resolves.toBe(true);

      expect(cartApiServiceStub.removeItem).toHaveBeenCalledWith("product-101");
      expect(cartApiServiceStub.getCart).toHaveBeenCalled();
      expect(service.items()).toEqual([]);
    });

    it("handles API failures without reloading", async () => {
      authState.set(true);
      cartApiServiceStub.removeItem.mockResolvedValue({
        ok: false,
        error: "Could not delete item.",
      });
      const service = setup();

      await expect(service.removeItem("product-101")).resolves.toBe(false);

      expect(cartApiServiceStub.getCart).not.toHaveBeenCalled();
      expect(toastServiceStub.show).toHaveBeenCalledWith(
        "Could not remove product",
        "Could not delete item.",
        "error",
        2000,
      );
    });

    it("rejects unauthenticated users", async () => {
      const service = setup();

      await expect(service.removeItem("product-101")).resolves.toBe(false);

      expect(cartApiServiceStub.removeItem).not.toHaveBeenCalled();
      expect(routerStub.navigate).toHaveBeenCalledWith(["/auth/signin"]);
    });
  });

  describe("syncCartFromApi", () => {
    it("shows a sync toast when requested and loadCart fails", async () => {
      const service = setup();

      await expect(service.syncCartFromApi(true)).resolves.toBe(false);

      expect(toastServiceStub.show).toHaveBeenCalledWith(
        "Could not sync cart",
        "We could not synchronize your cart right now.",
        "error",
        2000,
      );
    });
  });

  describe("AuthService authentication state", () => {
    it("uses the current access-token backed isAuthenticated signal", () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          { provide: PLATFORM_ID, useValue: "server" },
          { provide: Router, useValue: routerStub },
          { provide: ToastService, useValue: toastServiceStub },
          { provide: AuthApiService, useValue: {} },
        ],
      });
      const authService = TestBed.inject(AuthService);

      expect(authService.isAuthenticated()).toBe(false);

      authService.setAccessToken("server-issued-access-token");

      expect(authService.isAuthenticated()).toBe(true);

      authService.clearAccessToken();

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  function setup(options?: { platformId?: "browser" | "server" }): CartService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CartService,
        { provide: PLATFORM_ID, useValue: options?.platformId ?? "server" },
        { provide: AuthService, useValue: authServiceStub },
        { provide: CartApiService, useValue: cartApiServiceStub },
        { provide: Router, useValue: routerStub },
        { provide: ToastService, useValue: toastServiceStub },
      ],
    });

    return TestBed.inject(CartService);
  }
});

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
