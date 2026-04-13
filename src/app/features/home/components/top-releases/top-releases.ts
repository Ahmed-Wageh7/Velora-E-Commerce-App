import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { CollectionProduct, CollectionProductsService } from '../../../../core/services/collection-products.service';
import { toRequestState } from '../../../../core/utils/request-state';

@Component({
  selector: 'app-top-releases',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-releases.html',
  styleUrl: './top-releases.scss',
})
export class TopReleasesComponent {
  private readonly router = inject(Router);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly subcategoryId = '69d4fe2b9e39253830600a74';
  protected activeTargetId: string | null = null;
  protected readonly detailsFolder = 'top-release';
  private readonly cardRoutes = [
    '/watches/classic',
    '/collections/category-topaco',
    '/sunglasses/men',
    '/collections/frankel',
    '/collections/pegasus-collection',
    '/bags/promise',
    '/collections/arrogate',
    '/collections/enable-collection',
  ];

  protected readonly topReleasesState = toSignal(
    toRequestState(
      this.collectionProductsService.getProductsBySubcategoryId(this.subcategoryId, true, {
        includeDeleted: true,
      }),
      {
        initialData: [] as CollectionProduct[],
        loadingMessage: 'Loading top releases...',
        emptyMessage: 'No top releases are available right now.',
        errorMessage: 'We could not load top releases right now.',
      },
    ),
    {
      initialValue: {
        status: 'loading',
        data: [] as CollectionProduct[],
        message: 'Loading top releases...',
      },
    },
  );

  protected scrollCarousel(viewport: HTMLElement, direction: number): void {
    const card = viewport.querySelector('.perfume-card') as HTMLElement | null;
    const cardWidth = card?.offsetWidth ?? viewport.clientWidth;
    const gap = 20;

    viewport.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: 'smooth',
    });
  }

  protected trackById(_: number, product: CollectionProduct): string {
    return String(product.id);
  }

  protected async openProduct(product: CollectionProduct, index: number): Promise<void> {
    const targetRoute = this.cardRoutes[index];
    this.activeTargetId = targetRoute ?? product.id;

    try {
      if (targetRoute) {
        await this.router.navigateByUrl(targetRoute);
        return;
      }

      await this.router.navigate(['/product', this.detailsFolder, product.id]);
    } finally {
      this.activeTargetId = null;
    }
  }

  protected isOpeningProduct(product: CollectionProduct, index: number): boolean {
    return this.activeTargetId === (this.cardRoutes[index] ?? product.id);
  }
}
