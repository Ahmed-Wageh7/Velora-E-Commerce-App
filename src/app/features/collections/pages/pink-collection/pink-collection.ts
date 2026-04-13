import { AsyncPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartAnimationService } from '../../../../core/services/cart-animation.service';
import { CartService } from '../../../../core/services/cart.service';
import { CollectionProduct, CollectionProductsService } from '../../../../core/services/collection-products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SiteNavbar } from '../../../../shared/components/site-navbar/site-navbar';

@Component({
  selector: 'app-pink-collection-page',
  imports: [AsyncPipe, RouterLink, SiteNavbar],
  templateUrl: './pink-collection.html',
  styleUrl: './pink-collection.scss',
})
export class PinkCollectionPageComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  private readonly pageSize = 12;
  private readonly loadingProductIds = new Set<string>();
  protected readonly heroImageUrl = '/pink-collection/pink-head.webp';
  protected readonly promoImageUrl = '/pink.webp';
  protected isShowingMore = false;

  protected readonly sortOptions = ['Our Suggestions', 'Newest', 'Price: Low to High', 'Price: High to Low'];
  protected selectedSort = this.sortOptions[0];
  protected readonly pinkProducts$ = this.collectionProductsService.getCollectionProductsWithOptions('pink-collection', {
    includeDeleted: true,
    fetchAllPages: true,
  });
  protected visibleCount = this.pageSize;

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

  protected getVisibleProducts(products: CollectionProduct[]): CollectionProduct[] {
    return this.getSortedProducts(products).slice(0, this.visibleCount);
  }

  protected canShowMore(products: CollectionProduct[]): boolean {
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

  private getSortedProducts(products: CollectionProduct[]): CollectionProduct[] {
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
