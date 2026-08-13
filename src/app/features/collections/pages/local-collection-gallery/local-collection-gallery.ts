import { Component, computed, effect, inject, signal } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { delay, map, of, startWith, switchMap } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { CartAnimationService } from "../../../../core/cart/cart-animation.service";
import { CartService } from "../../../../core/cart/cart.service";
import { ProductListingService } from "../../../../core/api/product-listing.service";
import { TaxonomyService } from "../../../../core/api/taxonomy.service";
import { ToastService } from "../../../../core/notifications/toast.service";
import { SiteNavbar } from "../../../../layout/site-navbar/site-navbar";
import { LOCAL_COLLECTIONS } from "../../../../features/collections/data/local-collection-data";
import { LOCAL_COLLECTION_CONFIG_ALIASES } from "../../data/collection-route-aliases";
import { toRequestState } from "../../../../core/utils/request-state";
import { RequestState } from "../../../../models/common/request-state.model";
import { LocalCollectionPageConfig } from "../../../../models/collection/local-collection.model";
import { ProductListItem } from "../../../../models/product/product-list-item.model";
import {
  PRODUCT_SORT_OPTIONS,
  sortProducts,
  waitForButtonFeedback,
} from "../../components/shared/product-collection-ui";

@Component({
  selector: "app-local-collection-gallery-page",
  imports: [RouterLink, SiteNavbar],
  templateUrl: "./local-collection-gallery.html",
  styleUrl: "./local-collection-gallery.scss",
})
export class LocalCollectionGalleryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly productListingService = inject(ProductListingService);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 12;
  private readonly loadingProductIds = signal<ReadonlySet<string>>(new Set());
  private readonly routeSlug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get("slug") ?? "")),
    { initialValue: this.route.snapshot.paramMap.get("slug") ?? "" },
  );
  private readonly routeSubcategoryId = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get("subcategoryId") ?? ""),
    ),
    { initialValue: this.route.snapshot.paramMap.get("subcategoryId") ?? "" },
  );
  private readonly routeCategoryId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get("categoryId") ?? "")),
    { initialValue: this.route.snapshot.paramMap.get("categoryId") ?? "" },
  );
  private readonly localCollectionKey = computed(() =>
    this.getLocalCollectionKey(this.routeSlug()),
  );

  protected readonly sortOptions = PRODUCT_SORT_OPTIONS;
  private readonly apiCollection = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const routeSlug = params.get("slug") ?? "";
        const subcategoryId = params.get("subcategoryId") ?? "";
        const categoryId = params.get("categoryId") ?? "";

        if (categoryId) {
          return this.taxonomyService
            .findCategoryById(categoryId)
            .pipe(
              map((category) =>
                category
                  ? this.toCollectionConfig(category.name, routeSlug)
                  : this.toCollectionConfig(
                      this.toTitleFromSlug(routeSlug || "category"),
                      routeSlug,
                    ),
              ),
            );
        }

        return this.taxonomyService
          .findSubcategoryById(subcategoryId)
          .pipe(
            map((metadata) =>
              metadata
                ? this.toCollectionConfig(metadata.subcategory.name, routeSlug)
                : this.toCollectionConfig(
                    this.toTitleFromSlug(routeSlug || "collection"),
                    routeSlug,
                  ),
            ),
          );
      }),
      startWith(null as LocalCollectionPageConfig | null),
    ),
    { initialValue: null },
  );
  protected readonly collection = computed(() => {
    const routeSlug = this.routeSlug();
    const localCollection = this.getLocalCollection(routeSlug);
    const apiCollection = this.apiCollection();

    if (localCollection || apiCollection) {
      return {
        ...(apiCollection ??
          this.toCollectionConfig(this.toTitleFromSlug(routeSlug), routeSlug)),
        ...(localCollection ?? {}),
        title:
          apiCollection?.title ??
          localCollection?.title ??
          this.toTitleFromSlug(routeSlug),
      };
    }

    if (routeSlug || this.routeSubcategoryId() || this.routeCategoryId()) {
      return this.toCollectionConfig(
        this.toTitleFromSlug(routeSlug || "collection"),
        routeSlug,
      );
    }

    return null;
  });
  protected readonly selectedSort = signal<string>(this.sortOptions[0]);
  protected readonly visibleCount = signal(this.pageSize);
  protected readonly isShowingMore = signal(false);
  protected readonly heroImageUrl = computed(
    () => this.collection()?.heroImageFile ?? null,
  );
  private readonly productsState = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const subcategoryId = params.get("subcategoryId") ?? "";
        const categoryId = params.get("categoryId") ?? "";
        const routeSlug = params.get("slug") ?? "";
        const localCollection = this.getLocalCollection(routeSlug);

        if (categoryId) {
          return toRequestState(
            this.productListingService.getProductsByCategory(categoryId, {
              includeDeleted: true,
              fetchAllPages: true,
            }),
            {
              initialData: [] as ProductListItem[],
              loadingMessage: "Loading products...",
              emptyMessage: "No products are available in this category yet.",
              errorMessage: "We could not load this category right now.",
            },
          );
        }

        if (subcategoryId) {
          return toRequestState(
            this.productListingService
              .getProductsBySubcategory(subcategoryId, {
                includeDeleted: localCollection?.includeDeletedProducts ?? true,
                fetchAllPages: localCollection?.fetchAllPages ?? true,
              })
              .pipe(delay(localCollection?.minimumLoadingMs ?? 0)),
            {
              initialData: [] as ProductListItem[],
              loadingMessage: "Loading products...",
              emptyMessage: "No products are available in this collection yet.",
              errorMessage: "We could not load this collection right now.",
            },
          );
        }

        return of({
          status: "error",
          data: [] as ProductListItem[],
          message: "This collection does not exist.",
        } satisfies RequestState<ProductListItem[]>);
      }),
    ),
    {
      initialValue: {
        status: "loading",
        data: [] as ProductListItem[],
        message: "Loading products...",
      } satisfies RequestState<ProductListItem[]>,
    },
  );
  protected readonly collectionState = computed(() => {
    if (
      !this.collection() &&
      !this.routeSubcategoryId() &&
      !this.routeCategoryId()
    ) {
      return {
        status: "notfound" as const,
        data: [] as ProductListItem[],
        message: "This collection could not be found.",
      };
    }

    return this.productsState();
  });
  protected readonly products = computed(() => {
    return sortProducts(this.collectionState().data, this.selectedSort()).slice(
      0,
      this.visibleCount(),
    );
  });
  protected readonly totalProducts = computed(
    () => this.collectionState().data.length,
  );
  protected readonly isNewCovenantPage = computed(
    () => this.localCollectionKey() === "the-new-covenant-2026",
  );
  protected readonly hideTopHero = computed(() =>
    [
      "the-new-covenant-2026",
      "pegasus-collection",
      "dokhur-collection",
      "high-constdiration-collection",
      "new-collection",
      "special-offers",
      "perfumers-choices",
      "niche-group",
      "wild-colt",
    ].includes(this.localCollectionKey()),
  );
  protected readonly newCovenantFirstProduct = computed(() =>
    this.isNewCovenantPage() ? (this.products()[0] ?? null) : null,
  );
  protected readonly newCovenantRemainingProducts = computed(() =>
    this.isNewCovenantPage() ? this.products().slice(1) : this.products(),
  );

  constructor() {
    effect(() => {
      const currentCollection = this.collection();

      this.title.setTitle(
        currentCollection
          ? `Perfumes | ${currentCollection.title} | Veloura`
          : "Perfumes | Collection | Veloura",
      );
      this.selectedSort.set(this.sortOptions[0]);
      this.visibleCount.set(this.pageSize);
    });
  }

  protected canShowMore(): boolean {
    return this.visibleCount() < this.totalProducts();
  }

  protected showMore(): void {
    if (this.isShowingMore()) {
      return;
    }

    this.isShowingMore.set(true);

    window.setTimeout(() => {
      this.visibleCount.update((current) => current + this.pageSize);
      this.isShowingMore.set(false);
    }, 240);
  }

  protected updateSort(value: string): void {
    this.selectedSort.set(value);
    this.visibleCount.set(this.pageSize);
  }

  protected trackById(_: number, product: ProductListItem): string {
    return String(product.id);
  }

  protected getButtonLabel(product: ProductListItem): string {
    return product.quantity > 0 ? "Add to cart" : "Out of stock";
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds().has(productId);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getNewCovenantPromoImageUrl(index: 1 | 2): string {
    return index === 1
      ? "/collections/feature-heads/feature-head-1.webp"
      : "/collections/feature-heads/feature-head-2.jpg";
  }

  protected async addToCart(
    product: ProductListItem,
    event: MouseEvent,
  ): Promise<void> {
    if (product.quantity <= 0) {
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    this.loadingProductIds.update((ids) => new Set(ids).add(product.id));

    try {
      const added = await this.cartService.addToCartWithApi({
        id: product.id,
        name: product.name,
        price: product.price,
        description: `${product.name} collection product`,
        image: product.primaryImageUrl,
        detailFolder: this.collection()?.folder,
      });

      if (!added) {
        return;
      }

      await Promise.all([
        waitForButtonFeedback(),
        this.cartAnimationService.animateFromTrigger(
          trigger,
          product.primaryImageUrl,
        ),
      ]);
      this.toastService.showAddedToCart({
        name: product.name,
        image: product.primaryImageUrl,
        price: product.price,
        quantity: 1,
      });
    } finally {
      this.loadingProductIds.update((ids) => {
        const nextIds = new Set(ids);
        nextIds.delete(product.id);
        return nextIds;
      });
    }
  }

  private toCollectionConfig(
    title: string,
    folder: string,
  ): LocalCollectionPageConfig {
    return {
      title: this.toBrandLabel(title),
      folder,
      imageFiles: [],
      products: [],
      includeDeletedProducts: true,
      fetchAllPages: true,
    };
  }

  private getLocalCollection(
    routeSlug: string,
  ): LocalCollectionPageConfig | null {
    const configKey = this.getLocalCollectionKey(routeSlug);
    return LOCAL_COLLECTIONS[configKey] ?? null;
  }

  private getLocalCollectionKey(routeSlug: string): string {
    return LOCAL_COLLECTION_CONFIG_ALIASES[routeSlug] ?? routeSlug;
  }

  private toTitleFromSlug(slug: string): string {
    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private toBrandLabel(value: string): string {
    return value.replace(/assaf/gi, "Veloura").replace(/عساف/g, "Veloura");
  }
}
