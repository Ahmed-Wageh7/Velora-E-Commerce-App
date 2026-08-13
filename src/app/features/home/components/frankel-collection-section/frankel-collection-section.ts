import { Component, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { of, switchMap } from "rxjs";
import { CartAnimationService } from "../../../../core/cart/cart-animation.service";
import { CartService } from "../../../../core/cart/cart.service";
import { ProductListingService } from "../../../../core/api/product-listing.service";
import { TaxonomyService } from "../../../../core/api/taxonomy.service";
import { ToastService } from "../../../../core/notifications/toast.service";
import { toRequestState } from "../../../../core/utils/request-state";
import { ProductListItem } from "../../../../models/product/product-list-item.model";
import { waitForButtonFeedback } from "../../../collections/components/shared/product-collection-ui";

@Component({
  selector: "app-frankel-collection-section",
  imports: [RouterLink],
  templateUrl: "./frankel-collection-section.html",
  styleUrl: "./frankel-collection-section.scss",
})
export class FrankelCollectionSectionComponent {
  private readonly productListingService = inject(ProductListingService);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);

  private readonly loadingProductIds = signal<ReadonlySet<string>>(new Set());

  protected readonly detailsFolder = "category-frankel";

  protected readonly productsState = toSignal(
    toRequestState(
      this.taxonomyService.findSubcategoryBySlug("frankel").pipe(
        switchMap((metadata) => {
          const subcategoryId =
            metadata?.subcategory._id ?? metadata?.subcategory.id ?? "";

          return subcategoryId
            ? this.productListingService.getProductsBySubcategory(
                subcategoryId,
                {
                  fetchAllPages: true,
                  includeDeleted: true,
                },
              )
            : of([] as ProductListItem[]);
        }),
      ),
      {
        initialData: [] as ProductListItem[],
        loadingMessage: "Loading Frankel collection...",
        emptyMessage: "No Frankel products are available right now.",
        errorMessage: "We could not load the Frankel collection right now.",
      },
    ),
    {
      initialValue: {
        status: "loading",
        data: [] as ProductListItem[],
        message: "Loading Frankel collection...",
      },
    },
  );

  protected readonly visibleProducts = computed(() =>
    this.productsState().data.slice(0, 6),
  );

  protected trackById(_: number, product: ProductListItem): string {
    return `${product.id}`;
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
        description: `${product.name} frankel product`,
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
