import { Component, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { CartAnimationService } from "../../../../core/cart/cart-animation.service";
import { CartService } from "../../../../core/cart/cart.service";
import { ProductListingService } from "../../../../core/api/product-listing.service";
import { ToastService } from "../../../../core/notifications/toast.service";
import { toRequestState } from "../../../../core/utils/request-state";
import { ProductListItem } from "../../../../models/product/product-list-item.model";
import { waitForButtonFeedback } from "../../../collections/components/shared/product-collection-ui";

@Component({
  selector: "app-promise-showcase",
  imports: [RouterLink],
  templateUrl: "./promise-showcase.html",
  styleUrl: "./promise-showcase.scss",
})
export class PromiseShowcaseComponent {
  private readonly productListingService = inject(ProductListingService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);

  private readonly loadingProductIds = signal<ReadonlySet<string>>(new Set());

  private readonly promiseBagsSubcategoryId = "69d4fe299e39253830600a70";

  protected readonly detailsFolder = "promise-bags";

  protected readonly productsState = toSignal(
    toRequestState(
      this.productListingService.getProductsBySubcategory(
        this.promiseBagsSubcategoryId,
        {
          fetchAllPages: true,
          includeDeleted: true,
        },
      ),
      {
        initialData: [] as ProductListItem[],
        loadingMessage: "Loading Promise Bags...",
        emptyMessage: "No Promise Bags products are available right now.",
        errorMessage: "We could not load Promise Bags right now.",
      },
    ),
    {
      initialValue: {
        status: "loading",
        data: [] as ProductListItem[],
        message: "Loading Promise Bags...",
      },
    },
  );

  protected readonly visibleProducts = computed(() =>
    this.productsState().data.slice(0, 6),
  );

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
    return this.loadingProductIds().has(productId);
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
        description: `${product.name} promise bag`,
        image: product.primaryImageUrl,
        detailFolder: this.detailsFolder,
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
}
