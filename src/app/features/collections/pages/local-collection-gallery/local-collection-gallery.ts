import { ChangeDetectorRef, Component, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { delay, map, of, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { CartAnimationService } from '../../../../core/services/cart-animation.service';
import { CartService } from '../../../../core/services/cart.service';
import { CollectionProduct, CollectionProductsService } from '../../../../core/services/collection-products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SiteNavbar } from '../../../../shared/components/site-navbar/site-navbar';
import { NAV_LOCAL_COLLECTIONS } from '../../../../core/data/nav-route-aliases';
import { RequestState, toRequestState } from '../../../../core/utils/request-state';

@Component({
  selector: 'app-local-collection-gallery-page',
  imports: [RouterLink, SiteNavbar],
  templateUrl: './local-collection-gallery.html',
  styleUrl: './local-collection-gallery.scss',
})
export class LocalCollectionGalleryPageComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 12;
  private readonly loadingProductIds = new Set<string>();
  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );
  protected readonly sortOptions = ['Our Suggestions', 'Newest', 'Price: Low to High', 'Price: High to Low'];
  protected readonly collection = computed(() => NAV_LOCAL_COLLECTIONS[this.slug()] ?? null);
  protected readonly selectedSort = signal(this.sortOptions[0]);
  protected readonly visibleCount = signal(this.pageSize);
  protected isShowingMore = false;
  protected readonly heroImageUrl = computed(() => this.collection()?.heroImageFile ?? null);
  private readonly productsState = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('slug') ?? ''),
      switchMap((slug) => {
        const currentCollection = NAV_LOCAL_COLLECTIONS[slug];

        if (!currentCollection) {
          return of({
            status: 'error',
            data: [] as CollectionProduct[],
            message: 'This collection does not exist.',
          } satisfies RequestState<CollectionProduct[]>);
        }

        return toRequestState(
          this.collectionProductsService.getCollectionProductsWithOptions(currentCollection.folder, {
            includeDeleted: currentCollection.includeDeletedProducts ?? true,
            fetchAllPages: currentCollection.fetchAllPages ?? true,
          }).pipe(delay(currentCollection.minimumLoadingMs ?? 0)),
          {
            initialData: [] as CollectionProduct[],
            loadingMessage: 'Loading products...',
            emptyMessage: 'No products are available in this collection yet.',
            errorMessage: 'We could not load this collection right now.',
          },
        );
      }),
    ),
    {
      initialValue: {
        status: 'loading',
        data: [] as CollectionProduct[],
        message: 'Loading products...',
      } satisfies RequestState<CollectionProduct[]>,
    },
  );
  protected readonly collectionState = computed(() => {
    if (!this.collection()) {
      return {
        status: 'notfound' as const,
        data: [] as CollectionProduct[],
        message: 'This collection could not be found.',
      };
    }

    return this.productsState();
  });
  protected readonly products = computed(() => {
    return this.getSortedProducts(this.collectionState().data).slice(0, this.visibleCount());
  });
  protected readonly totalProducts = computed(() => this.collectionState().data.length);
  protected readonly isNewCovenantPage = computed(() => this.slug() === 'the-new-covenant-2026');
  protected readonly hideTopHero = computed(() =>
    [
      'the-new-covenant-2026',
      'pegasus-collection',
      'dokhur-collection',
      'high-constdiration-collection',
      'new-collection',
      'special-offers',
      'perfumers-choices',
      'niche-group',
      'wild-colt',
    ].includes(this.slug()),
  );
  protected readonly newCovenantFirstProduct = computed(() => this.isNewCovenantPage() ? this.products()[0] ?? null : null);
  protected readonly newCovenantRemainingProducts = computed(() => this.isNewCovenantPage() ? this.products().slice(1) : this.products());

  constructor() {
    effect(() => {
      const currentCollection = this.collection();

      this.title.setTitle(
        currentCollection ? `Perfumes | ${currentCollection.title} | Veloura` : 'Perfumes | Collection | Veloura',
      );
      this.selectedSort.set(this.sortOptions[0]);
      this.visibleCount.set(this.pageSize);
    });
  }

  protected canShowMore(): boolean {
    return this.visibleCount() < this.totalProducts();
  }

  protected showMore(): void {
    if (this.isShowingMore) {
      return;
    }

    this.isShowingMore = true;
    this.changeDetectorRef.detectChanges();

    window.setTimeout(() => {
      this.visibleCount.update((current) => current + this.pageSize);
      this.isShowingMore = false;
      this.changeDetectorRef.detectChanges();
    }, 240);
  }

  protected updateSort(value: string): void {
    this.selectedSort.set(value);
    this.visibleCount.set(this.pageSize);
  }

  protected trackById(_: number, product: CollectionProduct): string {
    return String(product.id);
  }

  protected getButtonLabel(product: CollectionProduct): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getNewCovenantPromoImageUrl(index: 1 | 2): string {
    return index === 1 ? '/new-constant-head-1.webp' : '/new-constant-head-2.jpg';
  }

  protected async addToCart(product: CollectionProduct, event: MouseEvent): Promise<void> {
    if (product.quantity <= 0) {
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    this.loadingProductIds.add(product.id);
    this.changeDetectorRef.detectChanges();

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
        this.waitForButtonFeedback(),
        this.cartAnimationService.animateFromTrigger(trigger, product.primaryImageUrl),
      ]);
      this.toastService.showAddedToCart({
        name: product.name,
        image: product.primaryImageUrl,
        price: product.price,
        quantity: 1,
      });
    } finally {
      this.loadingProductIds.delete(product.id);
      this.changeDetectorRef.detectChanges();
    }
  }

  private getSortedProducts(products: CollectionProduct[]): CollectionProduct[] {
    const sortedProducts = [...products];

    switch (this.selectedSort()) {
      case 'Newest':
        return sortedProducts.sort((left, right) => right.id.localeCompare(left.id));
      case 'Price: Low to High':
        return sortedProducts.sort((left, right) => left.price - right.price);
      case 'Price: High to Low':
        return sortedProducts.sort((left, right) => right.price - left.price);
      default:
        return sortedProducts.sort((left, right) => left.id.localeCompare(right.id));
    }
  }

  private waitForButtonFeedback(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 240));
  }
}
