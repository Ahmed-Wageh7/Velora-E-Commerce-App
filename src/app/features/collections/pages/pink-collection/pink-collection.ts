import { AsyncPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { CartAnimationService } from '../../../../core/cart/cart-animation.service';
import { CartService } from '../../../../core/cart/cart.service';
import { ProductListingService } from '../../../../core/api/product-listing.service';
import { TaxonomyService } from '../../../../core/api/taxonomy.service';
import { ProductListItem } from '../../../../models/product/product-list-item.model';
import { ToastService } from '../../../../core/notifications/toast.service';
import { SiteNavbar } from '../../../../layout/site-navbar/site-navbar';

@Component({
  selector: 'app-pink-collection-page',
  imports: [AsyncPipe, RouterLink, SiteNavbar],
  templateUrl: './pink-collection.html',
  styleUrl: './pink-collection.scss',
})
export class PinkCollectionPageComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly productListingService = inject(ProductListingService);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 12;
  private readonly loadingProductIds = new Set<string>();
  protected readonly heroImageUrl = '/pink-collection/pink-head.webp';
  protected readonly promoImageUrl = '/collections/promos/pink-collection.webp';
  protected isShowingMore = false;

  protected readonly sortOptions = ['Our Suggestions', 'Newest', 'Price: Low to High', 'Price: High to Low'];
  protected selectedSort = this.sortOptions[0];
  protected readonly pinkProducts$ = this.taxonomyService.findSubcategoryBySlug('pink-collection').pipe(
    switchMap((match) =>
      match?.subcategory._id
        ? this.productListingService.getProductsBySubcategory(match.subcategory._id, {
            includeDeleted: true,
            fetchAllPages: true,
          })
        : of([] as ProductListItem[]),
    ),
  );
  protected visibleCount = this.pageSize;

  protected trackById(_: number, product: ProductListItem): string {
    return String(product.id);
  }

  protected getButtonLabel(product: ProductListItem): string {
    return product.quantity > 0 ? 'Add to cart' : 'Out of stock';
  }

  protected isAddingToCart(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getVisibleProducts(products: ProductListItem[]): ProductListItem[] {
    return this.getSortedProducts(products).slice(0, this.visibleCount);
  }

  protected canShowMore(products: ProductListItem[]): boolean {
    return this.visibleCount < this.getSortedProducts(products).length;
  }

  protected showMore(): void {
    if (this.isShowingMore) {
      return;
    }

    this.isShowingMore = true;
    this.changeDetectorRef.detectChanges();

    window.setTimeout(() => {
      this.visibleCount += this.pageSize;
      this.isShowingMore = false;
      this.changeDetectorRef.detectChanges();
    }, 240);
  }

  protected updateSort(value: string): void {
    this.selectedSort = value;
    this.visibleCount = this.pageSize;
  }

  private getSortedProducts(products: ProductListItem[]): ProductListItem[] {
    const sortedProducts = [...products];

    switch (this.selectedSort) {
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

  protected async addToCart(product: ProductListItem, event: MouseEvent): Promise<void> {
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
        description: `${product.name} pink collection product`,
        image: product.primaryImageUrl,
        detailFolder: 'pink-collection',
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

  private waitForButtonFeedback(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 240));
  }
}
