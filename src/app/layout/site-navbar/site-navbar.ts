import { CommonModule, DOCUMENT } from "@angular/common";
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { firstValueFrom, forkJoin, of } from "rxjs";
import { catchError, filter, map, switchMap } from "rxjs/operators";
import { AuthService } from "../../core/auth/auth.service";
import { CartService } from "../../core/cart/cart.service";
import { ProductListingService } from "../../core/api/product-listing.service";
import { TaxonomyService } from "../../core/api/taxonomy.service";
import { SearchResult } from "../../models/navigation/search-result.model";
import { ProductListItem } from "../../models/product/product-list-item.model";

@Component({
  selector: "app-site-navbar",
  imports: [CommonModule, RouterLink],
  templateUrl: "./site-navbar.html",
  styleUrl: "./site-navbar.scss",
})
export class SiteNavbar {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly productListingService = inject(ProductListingService);
  private readonly cartService = inject(CartService);
  private readonly taxonomyService = inject(TaxonomyService);

  @ViewChild("topBar") private topBarRef?: ElementRef<HTMLElement>;
  @ViewChild("navbarShell") private navbarShellRef?: ElementRef<HTMLElement>;

  protected readonly isMenuOpen = signal(false);
  protected readonly isScrolled = signal(false);
  protected readonly isNavbarDocked = signal(false);
  protected readonly navbarSpacerHeight = signal(0);
  protected readonly activeMobilePanel = signal("root");
  protected readonly isSearchModalOpen = signal(false);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isSearchLoading = signal(false);

  protected readonly navItems = toSignal(this.taxonomyService.getNavItems(), {
    initialValue: [],
  });

  protected readonly rootNavItems = computed(() => this.navItems());

  protected readonly dropdownNavItems = computed(() =>
    this.navItems().filter((item) => item.children.length > 0),
  );

  protected readonly directNavItems = computed(() =>
    this.navItems().filter((item) => item.children.length === 0),
  );

  protected readonly mobilePanels = computed(() =>
    this.dropdownNavItems().map((item) => item.slug),
  );

  protected readonly searchQuery = signal("");
  protected readonly searchResults = signal<SearchResult[]>([]);
  protected readonly isSearchLoadingState = computed(() =>
    this.isSearchLoading(),
  );

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
        [item.name, item.subtitle, item.collectionLabel].some((value) =>
          value.toLowerCase().includes(query),
        ),
      )
      .slice(0, 8);
  });

  constructor() {
    afterNextRender(() => {
      this.updateNavbarMeasurements();
      this.updateNavbarDockState();
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isSearchModalOpen.set(false);
        this.searchQuery.set("");
        this.searchResults.set([]);
        this.syncBodyOverflow();
      });
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);

    if (!this.isMenuOpen()) {
      this.activeMobilePanel.set("root");
    }
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
    this.activeMobilePanel.set("root");
  }

  protected async openSearchModal(): Promise<void> {
    this.isSearchModalOpen.set(true);
    this.searchQuery.set("");
    this.searchResults.set([]);
    this.isSearchLoading.set(true);
    this.document.body.style.overflow = "hidden";

    try {
      this.searchResults.set(await this.loadSearchResultsForCurrentRoute());
    } finally {
      this.isSearchLoading.set(false);
    }
  }

  protected closeSearchModal(): void {
    this.isSearchModalOpen.set(false);
    this.searchQuery.set("");
    this.searchResults.set([]);
    this.syncBodyOverflow();
  }

  protected updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected openMobilePanel(panel: string): void {
    this.activeMobilePanel.set(panel);
  }

  protected goToRootPanel(): void {
    this.activeMobilePanel.set("root");
  }

  protected getMobilePanelOffset(): string {
    if (this.activeMobilePanel() === "root") {
      return "0%";
    }

    const panelIndex = this.mobilePanels().findIndex(
      (panel) => panel === this.activeMobilePanel(),
    );

    const totalPanels = this.mobilePanels().length + 1;

    return `${((panelIndex + 1) * -100) / totalPanels}%`;
  }

  protected getMobilePanelTrackWidth(): string {
    return `${(this.mobilePanels().length + 1) * 100}%`;
  }

  protected getMobilePanelWidth(): string {
    return `${100 / (this.mobilePanels().length + 1)}%`;
  }

  @HostListener("window:scroll")
  protected onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 50);
    this.updateNavbarDockState();
  }

  @HostListener("window:resize")
  protected onWindowResize(): void {
    this.updateNavbarMeasurements();
    this.updateNavbarDockState();
  }

  @HostListener("document:keydown.escape")
  protected onEscape(): void {
    if (this.isSearchModalOpen()) {
      this.closeSearchModal();
    }
  }

  private updateNavbarMeasurements(): void {
    this.navbarSpacerHeight.set(
      this.navbarShellRef?.nativeElement.offsetHeight ?? 0,
    );
  }

  private updateNavbarDockState(): void {
    const topBarHeight = this.topBarRef?.nativeElement.offsetHeight ?? 0;

    this.isNavbarDocked.set(window.scrollY >= topBarHeight);

    this.updateNavbarMeasurements();
  }

  private syncBodyOverflow(): void {
    this.document.body.style.overflow = this.isSearchModalOpen()
      ? "hidden"
      : "";
  }

  private async loadSearchResultsForCurrentRoute(): Promise<SearchResult[]> {
    const url = this.router.url;
    const cacheKey = url || "/";

    const cached = this.searchCatalogCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    let results: SearchResult[];

    if (url === "/" || url === "") {
      results = await this.loadHomeSearchResults();
    } else if (url.startsWith("/collections/")) {
      results = await this.loadCollectionResultsForUrl(url);
    } else if (url.startsWith("/category/")) {
      results = await this.loadCategoryResultsForUrl(url);
    } else {
      results = await this.loadHomeSearchResults();
    }

    this.searchCatalogCache.set(cacheKey, results);

    return results;
  }

  private async loadCollectionResultsForUrl(
    url: string,
  ): Promise<SearchResult[]> {
    const [, , subcategoryId] = url.split("/");

    if (!subcategoryId) {
      return [];
    }

    const metadata = await firstValueFrom(
      this.taxonomyService.findSubcategoryById(subcategoryId),
    );

    if (!metadata) {
      return [];
    }

    return this.loadSubcategoryResults(
      subcategoryId,
      metadata.subcategory.name,
    );
  }

  private async loadSubcategoryResults(
    subcategoryId: string,
    collectionLabel: string,
  ): Promise<SearchResult[]> {
    const products = await firstValueFrom(
      this.productListingService.getProductsBySubcategory(subcategoryId, {
        includeDeleted: true,
        fetchAllPages: true,
      }),
    );

    return this.toSearchResults(products, collectionLabel);
  }

  private async loadCategoryResultsForUrl(
    url: string,
  ): Promise<SearchResult[]> {
    const [, , categoryId, slug] = url.split("/");

    if (!categoryId) {
      return [];
    }

    const products = await firstValueFrom(
      this.productListingService.getProductsByCategory(categoryId, {
        includeDeleted: true,
        fetchAllPages: true,
      }),
    );

    return this.toSearchResults(
      products,
      this.toLabelFromSlug(slug ?? "Category"),
    );
  }

  private async loadHomeSearchResults(): Promise<SearchResult[]> {
    const [fragrances, artProducts, promiseProducts] = await Promise.all([
      this.loadProductsBySubcategorySlug("fragrances"),
      this.loadProductsBySubcategorySlug("The-Art-Dedication"),
      this.loadProductsBySubcategorySlug("promise-bags"),
    ]);

    return [
      ...this.toHomeSearchResults(fragrances, "Fragrances"),

      ...this.toHomeSearchResults(artProducts, "The Art of Dedication"),

      ...this.toHomeSearchResults(promiseProducts, "Promise Bags"),
    ];
  }

  private async loadProductsBySubcategorySlug(
    slug: string,
  ): Promise<ProductListItem[]> {
    const match = await firstValueFrom(
      this.taxonomyService
        .findSubcategoryBySlug(slug)
        .pipe(catchError(() => of(null))),
    );

    const subcategoryId = match?.subcategory?._id;

    if (!subcategoryId) {
      return [];
    }

    return firstValueFrom(
      this.productListingService
        .getProductsBySubcategory(subcategoryId, {
          includeDeleted: true,
          fetchAllPages: true,
        })
        .pipe(catchError(() => of([] as ProductListItem[]))),
    );
  }

  private toHomeSearchResults(
    products: ProductListItem[],
    collectionLabel: string,
  ): SearchResult[] {
    return products.map((product) => ({
      id: `${collectionLabel}-${product.id}`,
      name: product.name,
      subtitle: collectionLabel,
      collectionLabel,
      imageUrl: product.primaryImageUrl,
      route: ["/product", product.id],
    }));
  }

  private toSearchResults(
    products: ProductListItem[],
    collectionLabel: string,
  ): SearchResult[] {
    return products.map((product) => ({
      id: `${collectionLabel}-${product.id}`,
      name: product.name,
      subtitle: collectionLabel,
      collectionLabel,
      imageUrl: product.primaryImageUrl,
      route: ["/product", product.id],
    }));
  }

  private toLabelFromSlug(slug: string): string {
    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
