import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { ProductListingService } from "../../../../core/api/product-listing.service";
import { toRequestState } from "../../../../core/utils/request-state";
import { ProductListItem } from "../../../../models/product/product-list-item.model";

@Component({
  selector: "app-top-releases",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./top-releases.html",
  styleUrl: "./top-releases.scss",
})
export class TopReleasesComponent {
  private readonly router = inject(Router);
  private readonly productListingService = inject(ProductListingService);

  private readonly subcategoryId = "69d4fe2b9e39253830600a74";

  protected readonly detailsFolder = "top-release";
  protected activeTargetId: string | null = null;

  private readonly cardRoutes = [
    "/watches/classic",
    "/collections/category-topaco",
    "/sunglasses/men",
    "/collections/frankel",
    "/collections/pegasus-collection",
    "/bags/promise",
    "/collections/arrogate",
    "/collections/enable-collection",
  ];

  protected readonly topReleasesState = toSignal(
    toRequestState(
      this.productListingService.getProductsBySubcategory(this.subcategoryId, {
        fetchAllPages: true,
        includeDeleted: true,
      }),
      {
        initialData: [] as ProductListItem[],
        loadingMessage: "Loading top releases...",
        emptyMessage: "No top releases are available right now.",
        errorMessage: "We could not load top releases right now.",
      },
    ),
    {
      initialValue: {
        status: "loading" as const,
        data: [] as ProductListItem[],
        message: "Loading top releases...",
      },
    },
  );

  protected scrollCarousel(viewport: HTMLElement, direction: number): void {
    const card = viewport.querySelector(".perfume-card") as HTMLElement | null;

    const cardWidth = card?.offsetWidth ?? viewport.clientWidth;
    const gap = 20;

    viewport.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: "smooth",
    });
  }

  protected trackById(_: number, product: ProductListItem): string {
    return String(product.id);
  }

  protected async openProduct(
    product: ProductListItem,
    index: number,
  ): Promise<void> {
    const targetRoute = this.cardRoutes[index];

    this.activeTargetId = targetRoute ?? product.id;

    try {
      if (targetRoute) {
        await this.router.navigateByUrl(targetRoute);
        return;
      }

      await this.router.navigate(["/product", product.id]);
    } finally {
      this.activeTargetId = null;
    }
  }

  protected isOpeningProduct(product: ProductListItem, index: number): boolean {
    return this.activeTargetId === (this.cardRoutes[index] ?? product.id);
  }
}
