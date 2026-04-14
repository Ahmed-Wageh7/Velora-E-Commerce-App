import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { firstValueFrom, filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ArtDedicationService } from '../../../core/services/art-dedication.service';
import { CartService } from '../../../core/services/cart.service';
import { CollectionProductsService } from '../../../core/services/collection-products.service';
import { CareProductsService } from '../../../core/services/care-products.service';
import { FragrancesService } from '../../../core/services/fragrances.service';
import { PromiseHomeProductsService } from '../../../core/services/promise-home-products.service';
import { TaxonomyService } from '../../../core/services/taxonomy.service';
import { NAV_LOCAL_COLLECTIONS } from '../../../core/data/nav-route-aliases';
import { CollectionQuery } from '../../../core/services/product-api.utils';

@Component({
  selector: 'app-site-navbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './site-navbar.html',
  styleUrl: './site-navbar.scss',
})
export class SiteNavbar implements AfterViewInit {
  private readonly document = inject(DOCUMENT);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly collectionProductsService = inject(CollectionProductsService);
  private readonly careProductsService = inject(CareProductsService);
  private readonly fragrancesService = inject(FragrancesService);
  private readonly artDedicationService = inject(ArtDedicationService);
  private readonly promiseHomeProductsService = inject(PromiseHomeProductsService);
  private readonly cartService = inject(CartService);
  private readonly taxonomyService = inject(TaxonomyService);

  @ViewChild('topBar') private topBarRef?: ElementRef<HTMLElement>;
  @ViewChild('navbarShell') private navbarShellRef?: ElementRef<HTMLElement>;

  protected isMenuOpen = false;
  protected isScrolled = false;
  protected isNavbarDocked = false;
  protected navbarSpacerHeight = 0;
  protected activeMobilePanel = 'root';
  protected isSearchModalOpen = false;
  protected readonly currentUser = this.authService.currentUser;
  protected isSearchLoading = false;
  protected readonly navItems = toSignal(this.taxonomyService.getNavItems(), { initialValue: [] });
  protected readonly rootNavItems = computed(() => this.navItems());
  protected readonly dropdownNavItems = computed(() => this.navItems().filter((item) => item.children.length > 0));
  protected readonly directNavItems = computed(() => this.navItems().filter((item) => item.children.length === 0));
  protected readonly mobilePanels = computed(() => this.dropdownNavItems().map((item) => item.slug));
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchResult[]>([]);
  private readonly searchCatalogCache = new Map<string, SearchResult[]>();
  protected readonly cartCount = computed(() =>
    this.cartService.items().reduce((total, item) => total + item.quantity, 0),
  );
  protected readonly filteredSearchResults = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    if (!query) {
      return this.searchResults().slice(0, 8);
    }

    return this.searchResults()
      .filter((item) =>
        [item.name, item.subtitle, item.collectionLabel].some((value) => value.toLowerCase().includes(query)),
      )
      .slice(0, 8);
  });
  ngAfterViewInit(): void {
    this.updateNavbarMeasurements();
    this.updateNavbarDockState();
    this.changeDetectorRef.detectChanges();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isSearchModalOpen = false;
        this.searchQuery.set('');
        this.searchResults.set([]);
        this.syncBodyOverflow();
      });
  }

  protected toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;

    if (!this.isMenuOpen) {
      this.activeMobilePanel = 'root';
    }
  }

  protected closeMenu(): void {
    this.isMenuOpen = false;
    this.activeMobilePanel = 'root';
  }

  protected async openSearchModal(): Promise<void> {
    this.isSearchModalOpen = true;
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.isSearchLoading = true;
    this.document.body.style.overflow = 'hidden';

    try {
      this.searchResults.set(await this.loadSearchResultsForCurrentRoute());
    } finally {
      this.isSearchLoading = false;
    }
  }

  protected closeSearchModal(): void {
    this.isSearchModalOpen = false;
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.syncBodyOverflow();
  }

  protected updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected openMobilePanel(panel: string): void {
    this.activeMobilePanel = panel;
  }

  protected goToRootPanel(): void {
    this.activeMobilePanel = 'root';
  }

  protected getMobilePanelOffset(): string {
    if (this.activeMobilePanel === 'root') {
      return '0%';
    }

    const panelIndex = this.mobilePanels().findIndex((panel) => panel === this.activeMobilePanel);
    const totalPanels = this.mobilePanels().length + 1;
    return `${((panelIndex + 1) * -100) / totalPanels}%`;
  }

  protected getMobilePanelTrackWidth(): string {
    return `${(this.mobilePanels().length + 1) * 100}%`;
  }

  protected getMobilePanelWidth(): string {
    return `${100 / (this.mobilePanels().length + 1)}%`;
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.isScrolled = window.scrollY > 50;
    this.updateNavbarDockState();
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.updateNavbarMeasurements();
    this.updateNavbarDockState();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isSearchModalOpen) {
      this.closeSearchModal();
    }
  }

  private updateNavbarMeasurements(): void {
    this.navbarSpacerHeight = this.navbarShellRef?.nativeElement.offsetHeight ?? 0;
  }

  private updateNavbarDockState(): void {
    const topBarHeight = this.topBarRef?.nativeElement.offsetHeight ?? 0;
    this.isNavbarDocked = window.scrollY >= topBarHeight;
    this.updateNavbarMeasurements();
  }

  private syncBodyOverflow(): void {
    this.document.body.style.overflow = this.isSearchModalOpen ? 'hidden' : '';
  }

  private async loadSearchResultsForCurrentRoute(): Promise<SearchResult[]> {
    const url = this.router.url;
    const cacheKey = url || '/';
    const cached = this.searchCatalogCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    let results: SearchResult[];

    if (url === '/' || url === '') {
      results = await this.loadHomeSearchResults();
    } else if (url === '/collections/frankel') {
      results = await this.loadCollectionResults('category-frankel', 'Frankel');
    } else if (url === '/collections/arrogate') {
      results = await this.loadCollectionResults('Arrogate-collection', 'Arrogate');
    } else if (url === '/collections/pink-wild') {
      results = await this.loadCollectionResults('pink-collection', 'Pink Collection');
    } else if (url.startsWith('/collections/')) {
      const slug = url.split('/')[2] ?? '';
      const localCollection = NAV_LOCAL_COLLECTIONS[slug];
      results = localCollection
        ? await this.loadCollectionResults(localCollection.folder, localCollection.title)
        : await this.loadHomeSearchResults();
    } else if (url === '/care-products') {
      results = await this.loadCareResults();
    } else if (url === '/watches/classic') {
      results = await this.loadCollectionResults('classic-watches', 'Classic Watches');
    } else if (url === '/watches/sport') {
      results = await this.loadCollectionResults('sport-watches', 'Sports Watches');
    } else if (url === '/watches/women') {
      results = await this.loadCollectionResults('women-watches', 'Women Watches');
    } else if (url === '/bags/women') {
      results = await this.loadCollectionResults('women-bags', 'Women Bags');
    } else if (url === '/bags/children') {
      results = await this.loadCollectionResults('children-bags', 'Children Bags');
    } else if (url === '/bags/promise') {
      results = await this.loadCollectionResults('promise-bags', 'Promise Bags');
    } else if (url === '/sunglasses/men') {
      results = await this.loadQueriedCollectionResults(
        'men-sunglasses',
        'Men Sunglasses',
        { categoryName: 'Sunglasses', subcategoryName: 'men sunglasses' },
      );
    } else if (url === '/sunglasses/women') {
      results = await this.loadQueriedCollectionResults(
        'women-sunglasses',
        'Women Sunglasses',
        { categoryName: 'Sunglasses', subcategoryName: 'women sunglasses' },
      );
    } else if (url === '/offers/buy-1-get-2-free') {
      results = await this.loadCollectionResults('buy-one-get2-free', 'Buy 1 Get Two Free');
    } else if (url === '/offers/buy-2-get-third-free') {
      results = await this.loadCollectionResults('buy-two-get-third-free', 'Buy 2 Get Third Free');
    } else {
      results = await this.loadHomeSearchResults();
    }

    this.searchCatalogCache.set(cacheKey, results);
    return results;
  }

  private async loadCollectionResults(folder: string, collectionLabel: string): Promise<SearchResult[]> {
    const products = await firstValueFrom(this.collectionProductsService.getCollectionProducts(folder));

    return products.map((product) => ({
      id: `${folder}-${product.id}`,
      name: product.name,
      subtitle: collectionLabel,
      collectionLabel,
      imageUrl: product.primaryImageUrl,
      route: ['/product', folder, product.id],
    }));
  }

  private async loadQueriedCollectionResults(
    folder: string,
    collectionLabel: string,
    query: CollectionQuery,
  ): Promise<SearchResult[]> {
    const products = await firstValueFrom(this.collectionProductsService.getProductsByQuery(query));

    return products.map((product) => ({
      id: `${folder}-${product.id}`,
      name: product.name,
      subtitle: collectionLabel,
      collectionLabel,
      imageUrl: product.primaryImageUrl,
      route: ['/product', folder, product.id],
    }));
  }

  private async loadCareResults(): Promise<SearchResult[]> {
    const products = await firstValueFrom(this.careProductsService.getCareProducts());

    return products.map((product) => ({
      id: `care-${product.id}`,
      name: product.name,
      subtitle: 'Care product',
      collectionLabel: 'Care Products',
      imageUrl: product.primaryImageUrl,
      route: ['/product', 'care', product.id],
    }));
  }

  private async loadHomeSearchResults(): Promise<SearchResult[]> {
    const [fragrances, artProducts, topacoProducts, promiseProducts] = await Promise.all([
      firstValueFrom(this.fragrancesService.getFragrances()),
      firstValueFrom(this.artDedicationService.getArtDedicationProducts()),
      firstValueFrom(this.collectionProductsService.getCollectionProducts('category-topaco')),
      firstValueFrom(this.promiseHomeProductsService.getProducts()),
    ]);

    return [
      ...fragrances.map((product) => ({
        id: `fragrances-${product.id}`,
        name: product.name,
        subtitle: product.detail || product.badge || 'Fragrance',
        collectionLabel: 'Fragrances',
        imageUrl: product.imageUrl,
        route: ['/product', 'fragrances', product.id],
      })),
      ...artProducts.map((product) => ({
        id: `art-${product.id}`,
        name: product.name,
        subtitle: product.subtitle || 'The Art of Dedication',
        collectionLabel: 'The Art of Dedication',
        imageUrl: product.imageUrl,
        route: ['/product', 'The-Art-Dedication', product.id],
      })),
      ...topacoProducts.map((product) => ({
        id: `topaco-${product.id}`,
        name: product.name,
        subtitle: 'Topaco Collection',
        collectionLabel: 'Topaco Collection',
        imageUrl: product.primaryImageUrl,
        route: ['/product', 'category-topaco', product.id],
      })),
      ...promiseProducts.map((product) => ({
        id: `promise-${product.id}`,
        name: product.name,
        subtitle: product.detail || 'Promise Bags',
        collectionLabel: 'Promise Bags',
        imageUrl: product.imageUrl,
        route: ['/product', 'promise-bags', product.id],
      })),
    ];
  }
}

interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  collectionLabel: string;
  imageUrl: string;
  route: (string | number)[];
}
