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
  selector: "app-art-dedication",
  imports: [RouterLink],
  templateUrl: "./art-dedication.html",
  styleUrl: "./art-dedication.scss",
})
export class ArtDedicationComponent {
  private readonly productListingService = inject(ProductListingService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly loadingProductIds = signal<ReadonlySet<string>>(new Set());

  private readonly subcategoryId = "69d4fe2b9e39253830600a75";

  protected readonly detailsFolder = "The-Art-Dedication";

  protected readonly productsState = toSignal(
    toRequestState(
      this.productListingService.getProductsBySubcategory(this.subcategoryId, {
        fetchAllPages: true,
        includeDeleted: true,
      }),
      {
        initialData: [] as ProductListItem[],
        loadingMessage: "Loading products...",
        emptyMessage: "No products are available in this collection yet.",
        errorMessage: "We could not load this collection right now.",
      },
    ),
    {
      initialValue: {
        status: "loading" as const,
        data: [] as ProductListItem[],
        message: "Loading products...",
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
        description: `${product.name} art of dedication product`,
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
