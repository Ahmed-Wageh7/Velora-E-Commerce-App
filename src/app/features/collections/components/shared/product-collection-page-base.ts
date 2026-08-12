import { Directive, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { delay, of, switchMap } from 'rxjs';
import { ProductListingService } from '../../../../core/api/product-listing.service';
import { CartAnimationService } from '../../../../core/cart/cart-animation.service';
import { CartService } from '../../../../core/cart/cart.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { toRequestState } from '../../../../core/utils/request-state';
import { RequestState } from '../../../../models/common/request-state.model';
import { ProductListItem } from '../../../../models/product/product-list-item.model';
import { PRODUCT_SORT_OPTIONS, sortProducts, waitForButtonFeedback } from './product-collection-ui';

@Directive()
export abstract class ProductCollectionPageBase {
  private readonly productListingService = inject(ProductListingService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 12;
  private readonly loadingProductIds = signal<ReadonlySet<string>>(new Set());

  protected readonly defaultBreadcrumbParentLabel: string = '';
  protected readonly useCollectionFolderForRelativeHero: boolean = true;

  readonly pageTitle = input.required<string>();
  readonly breadcrumbLabel = input.required<string>();
  readonly breadcrumbParentLabel = input('');
  readonly collectionFolder = input.required<string>();
  readonly descriptionLabel = input.required<string>();
  readonly heroImageFile = input<string | null>(null);
  readonly subcategoryId = input<string | null>(null);
  readonly includeDeletedProducts = input(false);
  readonly fetchAllPages = input(false);
  readonly fetchAllSubcategoryPages = input(false);
  readonly minimumLoadingMs = input(0);
  readonly useCareShimmer = input(false);
  readonly hideHero = input(false);
  readonly fullWidthHero = input(false);
  readonly heroFullWidth = input(false);

  protected readonly sortOptions = PRODUCT_SORT_OPTIONS;
  protected readonly selectedSort = signal<string>(this.sortOptions[0]);
  protected readonly visibleCount = signal(this.pageSize);
  protected readonly isShowingMore = signal(false);
  protected readonly breadcrumbParent = computed(
    () => this.breadcrumbParentLabel() || this.defaultBreadcrumbParentLabel,
  );
  protected readonly hasHero = computed(() => Boolean(this.heroImageFile()) && !this.hideHero());
  protected readonly isHeroFullWidth = computed(() => this.fullWidthHero() || this.heroFullWidth());
  protected readonly heroImageUrl = computed(() => {
    const heroImageFile = this.heroImageFile();

    if (!heroImageFile) {
      return '';
    }

    if (heroImageFile.startsWith('/')) {
      return heroImageFile;
    }

    return this.useCollectionFolderForRelativeHero
      ? `/${this.collectionFolder()}/${heroImageFile}`
      : `/${heroImageFile}`;
  });
  protected readonly productsState = toSignal(
    toObservable(
      computed(() => ({
        subcategoryId: this.subcategoryId(),
        includeDeleted: this.includeDeletedProducts(),
        fetchAllPages: this.fetchAllPages() || this.fetchAllSubcategoryPages(),
        minimumLoadingMs: this.minimumLoadingMs(),
      })),
    ).pipe(
      switchMap(({ subcategoryId, includeDeleted, fetchAllPages, minimumLoadingMs }) =>
        toRequestState(
          (subcategoryId
            ? this.productListingService.getProductsBySubcategory(subcategoryId, {
                includeDeleted,
                fetchAllPages,
              })
            : of([] as ProductListItem[])
          ).pipe(delay(minimumLoadingMs)),
          {
            initialData: [] as ProductListItem[],
            loadingMessage: 'Loading products...',
            emptyMessage: 'No products are available in this collection yet.',
            errorMessage: 'We could not load this collection right now.',
          },
        ),
      ),
    ),
    {
      initialValue: {
        status: 'loading',
        data: [] as ProductListItem[],
        message: 'Loading products...',
      } satisfies RequestState<ProductListItem[]>,
    },
  );
  protected readonly visibleProducts = computed(() =>
    sortProducts(this.productsState().data, this.selectedSort()).slice(0, this.visibleCount()),
  );
  protected readonly canShowMore = computed(() => this.visibleCount() < this.productsState().data.length);

  protected trackById(_: number, product: ProductListItem): string {
    return String(product.id);
  }

  protected getButtonLabel(product: ProductListItem): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds().has(productId);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected showMore(): void {
    if (this.isShowingMore()) {
      return;
    }

    this.isShowingMore.set(true);

    window.setTimeout(() => {
      this.visibleCount.update((count) => count + this.pageSize);
      this.isShowingMore.set(false);
    }, 240);
  }

  protected updateSort(value: string): void {
    this.selectedSort.set(value);
    this.visibleCount.set(this.pageSize);
  }

  protected async addToCart(product: ProductListItem, event: MouseEvent): Promise<void> {
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
        description: `${product.name} ${this.descriptionLabel()}`,
        image: product.primaryImageUrl,
        detailFolder: this.collectionFolder(),
      });

      if (!added) {
        return;
      }

      await Promise.all([
        waitForButtonFeedback(),
        this.cartAnimationService.animateFromTrigger(trigger, product.primaryImageUrl),
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

}
