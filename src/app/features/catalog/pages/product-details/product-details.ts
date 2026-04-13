import { ChangeDetectorRef, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { CartAnimationService } from '../../../../core/services/cart-animation.service';
import { CartService } from '../../../../core/services/cart.service';
import { ProductDetails, ProductDetailsService } from '../../../../core/services/product-details.service';
import { ProductsService } from '../../../../core/services/products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SiteNavbar } from '../../../../shared/components/site-navbar/site-navbar';
import { RequestState } from '../../../../core/utils/request-state';

@Component({
  selector: 'app-product-details-page',
  imports: [RouterLink, SiteNavbar],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetailsPageComponent {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly cartAnimationService = inject(CartAnimationService);
  private readonly productDetailsService = inject(ProductDetailsService);
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly toastService = inject(ToastService);
  protected isAddingToCart = false;
  protected readonly selectedQuantity = signal(1);
  protected readonly selectedImage = signal('');
  protected readonly previewImage = signal<string | null>(null);
  private readonly activeProductImageRef = viewChild<ElementRef<HTMLImageElement>>('activeProductImage');

  private readonly productState$ = this.route.paramMap.pipe(
    switchMap((params) => {
      const folder = params.get('folder');
      const id = params.get('id');

      if (folder && id) {
        return this.productDetailsService.getProductDetails(folder, id).pipe(
          map((product) =>
            product
              ? ({ status: 'success', data: product, message: '' } satisfies RequestState<ProductDetails | null>)
              : ({
                  status: 'empty',
                  data: null,
                  message: 'The product you requested could not be found.',
                } satisfies RequestState<ProductDetails | null>),
          ),
          catchError(() =>
            of({
              status: 'error',
              data: null,
              message: 'We could not load this product right now.',
            } satisfies RequestState<ProductDetails | null>),
          ),
        );
      }

      const legacyId = params.get('id');

      if (!legacyId) {
        return of({
          status: 'empty',
          data: null,
          message: 'The product you requested could not be found.',
        } satisfies RequestState<ProductDetails | null>);
      }

      return this.productsService.getProductById(legacyId).pipe(
        map((product) => {
          if (!product) {
            return {
              status: 'empty',
              data: null,
              message: 'The product you requested could not be found.',
            } satisfies RequestState<ProductDetails | null>;
          }

          return {
            status: 'success',
            data: {
              id: product.id,
              folder: 'catalog',
              name: product.name,
              title: product.name,
              subtitle: '',
              badge: '',
              detail: '',
              description: product.description,
              price: product.price,
              originalPrice: product.price,
              quantity: 1,
              imageUrl: product.image,
              hoverImageUrl: product.image,
              galleryImageUrls: [product.image],
              sku: `catalog-${String(product.id).padStart(3, '0')}`,
              size: 'Standard size',
              productType: 'Product',
              status: 'In Stock',
              rating: 5,
              reviewsCount: 0,
              sections: [],
              relatedProducts: [],
            } satisfies ProductDetails,
            message: '',
          } satisfies RequestState<ProductDetails | null>;
        }),
        catchError(() =>
          of({
            status: 'error',
            data: null,
            message: 'We could not load this product right now.',
          } satisfies RequestState<ProductDetails | null>),
        ),
      );
    }),
    startWith({
      status: 'loading',
      data: null,
      message: 'Loading product...',
    } satisfies RequestState<ProductDetails | null>),
  );
  protected readonly productState = toSignal(this.productState$, { requireSync: true });
  protected readonly product = computed(() => this.productState().data);
  protected readonly stars = computed(() => Array.from({ length: 5 }));
  protected readonly breadcrumbLabel = computed(() => this.getCollectionLabel(this.product()?.folder ?? ''));
  protected readonly supportingImages = computed(() => {
    const product = this.product();

    if (!product) {
      return [];
    }

    return product.galleryImageUrls;
  });

  constructor() {
    this.productState$.subscribe((state) => {
      const product = state.data;
      this.title.setTitle(product ? `${product.name} | Veloura` : 'Product Details | Veloura');
      this.selectedQuantity.set(1);
      this.selectedImage.set(product?.imageUrl ?? '');
      this.previewImage.set(null);
    });
  }

  protected async addToCart(product: ProductDetails): Promise<void> {
    if (product.quantity <= 0) {
      return;
    }

    this.isAddingToCart = true;
    this.changeDetectorRef.detectChanges();

    try {
      const quantity = this.selectedQuantity();
      const added = await this.cartService.addToCartWithApi(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          description: product.description || `${product.name} ${product.productType.toLowerCase()}`,
          image: product.imageUrl,
          detailFolder: product.folder,
        },
        quantity,
      );

      if (!added) {
        return;
      }

      await Promise.all([
        this.waitForButtonFeedback(),
        this.cartAnimationService.animateFromSource(this.activeProductImageRef()?.nativeElement ?? null, this.getActiveImage(product)),
      ]);
      this.toastService.showAddedToCart({
        name: product.name,
        image: product.imageUrl,
        price: product.price,
        quantity,
      });
    } finally {
      this.isAddingToCart = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  protected decreaseQuantity(): void {
    this.selectedQuantity.update((quantity) => Math.max(1, quantity - 1));
    this.toastService.show('Quantity updated', `Selected quantity: ${this.selectedQuantity()}.`, 'info', 1200);
  }

  protected increaseQuantity(): void {
    const product = this.product();
    const maxQuantity = product?.quantity && product.quantity > 0 ? product.quantity : 1;

    this.selectedQuantity.update((quantity) => Math.min(maxQuantity, quantity + 1));
    this.toastService.show('Quantity updated', `Selected quantity: ${this.selectedQuantity()}.`, 'info', 1200);
  }

  protected formatPrice(price: number): string {
    return `${price} ﷼`;
  }

  protected getReviewLabel(product: ProductDetails): string {
    return product.reviewsCount > 0 ? `(${product.reviewsCount} reviews)` : '(New arrival)';
  }

  protected getActiveImage(product: ProductDetails): string {
    return this.selectedImage() || product.imageUrl;
  }

  protected selectImage(image: string): void {
    this.selectedImage.set(image);
  }

  protected openImagePreview(image: string): void {
    this.previewImage.set(image);
  }

  protected closeImagePreview(): void {
    this.previewImage.set(null);
  }

  protected scrollRelatedCarousel(viewport: HTMLElement, direction: number): void {
    const amount = Math.max(viewport.clientWidth * 0.7, 220);
    viewport.scrollBy({ left: amount * direction, behavior: 'smooth' });
  }

  private getCollectionLabel(folder: string): string {
    const labels: Record<string, string> = {
      'category-frankel': 'Frankel',
      'pink-collection': 'Pink Collection',
      'Arrogate-collection': 'Arrogate',
      'The-Art-Dedication': 'The Art of Dedication',
      fragrances: 'Fragrances',
      'promise-bags': 'Promise Bags',
      'women-sunglasses': 'Women’s Sunglasses',
      'men-sunglasses': 'Men’s Sunglasses',
      care: 'Care products',
      'category-topaco': 'Topaco Collection',
      'top-release': 'Top Releases',
    };

    return labels[folder] ?? this.prettyFolderName(folder);
  }

  private prettyFolderName(folder: string): string {
    return folder
      .replace(/^category-/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private waitForButtonFeedback(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 240));
  }
}
