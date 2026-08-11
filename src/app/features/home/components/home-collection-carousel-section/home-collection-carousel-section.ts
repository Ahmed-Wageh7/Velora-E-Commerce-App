import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  input,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { switchMap } from "rxjs";
import { CartAnimationService } from "../../../../core/cart/cart-animation.service";
import { CartService } from "../../../../core/cart/cart.service";
import { ProductListingService } from "../../../../core/api/product-listing.service";
import { ToastService } from "../../../../core/notifications/toast.service";
import { toRequestState } from "../../../../core/utils/request-state";
import { ProductListItem } from "../../../../models/product/product-list-item.model";

@Component({
  selector: "app-home-collection-carousel-section",
  imports: [RouterLink],
  templateUrl: "./home-collection-carousel-section.html",
  styleUrl: "./home-collection-carousel-section.scss",
})
export class HomeCollectionCarouselSectionComponent
  implements AfterViewInit, OnDestroy
{
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly productListingService = inject(
    ProductListingService,
  );
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly loadingProductIds = new Set<string>();
  private autoScrollIntervalId: ReturnType<typeof setInterval> | null = null;

  @ViewChild("viewport") private viewportRef?: ElementRef<HTMLElement>;

  readonly bannerImage = input.required<string>();
  readonly bannerAlt = input.required<string>();
  readonly title = input.required<string>();
  readonly targetRoute = input.required<string>();
  readonly collectionFolder = input.required<string>();
  readonly subcategoryId = input.required<string>();
  readonly uniformImageFill = input(false);
  readonly uniformBannerFrame = input(false);

  protected readonly productsState = toSignal(
    toObservable(computed(() => this.subcategoryId())).pipe(
      switchMap((subcategoryId) =>
        toRequestState(
          this.productListingService.getProductsBySubcategory(
            subcategoryId,
            { fetchAllPages: true, includeDeleted: true },
          ),
          {
            initialData: [] as ProductListItem[],
            loadingMessage: "Loading products...",
            emptyMessage: "No products are available right now.",
            errorMessage: "We could not load this collection right now.",
          },
        ),
      ),
    ),
    {
      initialValue: {
        status: "loading" as const,
        data: [] as ProductListItem[],
        message: "Loading products...",
      },
    },
  );

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.startAutoScroll();
  }

  ngOnDestroy(): void {
    this.pauseAutoScroll();
  }

  protected trackById(_: number, product: ProductListItem): string {
    return String(product.id);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getButtonLabel(product: ProductListItem): string {
    return product.quantity > 0 ? "Add to cart" : "Out of stock";
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  protected pauseAutoScroll(): void {
    if (this.autoScrollIntervalId) {
      clearInterval(this.autoScrollIntervalId);
      this.autoScrollIntervalId = null;
    }
  }

  protected resumeAutoScroll(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.autoScrollIntervalId) {
      this.startAutoScroll();
    }
  }

  protected async addToCart(
    product: ProductListItem,
    event: MouseEvent,
  ): Promise<void> {
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
        description: `${product.name} ${this.title()}`,
        image: product.primaryImageUrl,
        detailFolder: this.collectionFolder(),
      });

      if (!added) {
        return;
      }

      await Promise.all([
        this.waitForButtonFeedback(),
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
      this.loadingProductIds.delete(product.id);
      this.changeDetectorRef.detectChanges();
    }
  }

  private startAutoScroll(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.pauseAutoScroll();

    this.autoScrollIntervalId = setInterval(() => {
      const viewport = this.viewportRef?.nativeElement;
      const firstCard = viewport?.querySelector(
        ".home-collection-card",
      ) as HTMLElement | null;

      if (!viewport || !firstCard) {
        return;
      }

      if (typeof viewport.scrollTo !== "function") {
        return;
      }

      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;

      if (maxScrollLeft <= 0) {
        return;
      }

      const cardWidth = firstCard.offsetWidth;
      const gap = 24;
      const nextScrollLeft = viewport.scrollLeft + cardWidth + gap;

      if (nextScrollLeft >= maxScrollLeft - 8) {
        viewport.scrollTo({
          left: 0,
          behavior: "smooth",
        });
        return;
      }

      viewport.scrollTo({
        left: nextScrollLeft,
        behavior: "smooth",
      });
    }, 6000);
  }

  private waitForButtonFeedback(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 240));
  }
}
