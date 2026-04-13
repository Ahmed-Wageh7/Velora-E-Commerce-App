import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { TaxonomyApiCategory, TaxonomyApiSubcategory, TaxonomyApiResponse, buildCategoriesUrl, extractCategories } from './product-api.utils';

export interface NavLinkItem {
  id: string;
  label: string;
  slug: string;
  route: string;
  children: NavLinkItem[];
}

@Injectable({
  providedIn: 'root',
})
export class TaxonomyService {
  private readonly http = inject(HttpClient);

  private readonly navItems$ = this.http.get<TaxonomyApiResponse>(buildCategoriesUrl()).pipe(
    map((response) => extractCategories(response)),
    map((categories) =>
      this.sortNavItems(categories.map((category) => this.toNavLinkItem(category)).filter((item): item is NavLinkItem => item !== null)),
    ),
    catchError(() =>
      of(
        this.sortNavItems(
          FALLBACK_TAXONOMY.map((category) => this.toNavLinkItem(category)).filter((item): item is NavLinkItem => item !== null),
        ),
      ),
    ),
    shareReplay(1),
  );

  getNavItems(): Observable<NavLinkItem[]> {
    return this.navItems$;
  }

  private toNavLinkItem(category: TaxonomyApiCategory): NavLinkItem | null {
    const rawLabel = category.name.trim();
    const label = this.toBrandLabel(rawLabel);
    const slug = this.slugify(rawLabel);

    if (slug === 'home') {
      return null;
    }

    const children = this.getNavChildren(rawLabel, slug, category.subcategories ?? []);

    return {
      id: category._id ?? category.id ?? slug,
      label,
      slug,
      route: this.resolveCategoryRoute(rawLabel),
      children,
    };
  }

  private getNavChildren(
    categoryName: string,
    categorySlug: string,
    subcategories: TaxonomyApiSubcategory[],
  ): NavLinkItem[] {
    if (!this.shouldExposeChildren(categorySlug)) {
      return [];
    }

    if (categorySlug === 'assaf-bags' || categorySlug === 'veloura-bags') {
      return VELOURA_BAGS_NAV_ITEMS.map((subcategory) => this.toSubcategoryNavLinkItem(categoryName, subcategory));
    }

    return subcategories
      .filter((subcategory) => this.slugify(subcategory.name) !== 'home')
      .map((subcategory) => this.toSubcategoryNavLinkItem(categoryName, subcategory));
  }

  private toSubcategoryNavLinkItem(parentCategoryName: string, subcategory: TaxonomyApiSubcategory): NavLinkItem {
    const rawLabel = subcategory.name.trim();
    const label = this.toBrandLabel(rawLabel);
    const slug = this.slugify(rawLabel);

    return {
      id: subcategory._id ?? subcategory.id ?? `${this.slugify(parentCategoryName)}-${slug}`,
      label,
      slug,
      route: this.resolveSubcategoryRoute(parentCategoryName, rawLabel),
      children: [],
    };
  }

  private resolveCategoryRoute(categoryName: string): string {
    const normalized = this.slugify(categoryName);
    const categoryRouteMap: Record<string, string> = {
      'buy-2-get-third-free': '/offers/buy-2-get-third-free',
      'buy-1-get-two-free': '/offers/buy-1-get-2-free',
      'assaf-discounts': '/collections/assaf-discounts',
      'veloura-discounts': '/collections/assaf-discounts',
      'care-products': '/care-products',
      home: '/',
    };

    return categoryRouteMap[normalized] ?? `/collections/${normalized}`;
  }

  private resolveSubcategoryRoute(parentCategoryName: string, subcategoryName: string): string {
    const parentSlug = this.slugify(parentCategoryName);
    const slug = this.slugify(subcategoryName);
    const subcategoryRouteMap: Record<string, string> = {
      'perfumes:arrogate-collection': '/collections/arrogate',
      'perfumes:art-of-detecation-perfumes': '/collections/art-of-detecation-perfumes',
      'perfumes:pegasus-collection': '/collections/pegasus-collection',
      'perfumes:topacco-collection': '/collections/category-topaco',
      'perfumes:dokhur-collection': '/collections/dokhur-collection',
      'perfumes:enable-collection': '/collections/enable-collection',
      'perfumes:gift-of-nobles': '/collections/gift-of-nobles',
      'perfumes:lady-collection': '/collections/lady-collection',
      'perfumes:high-constdiration-collection': '/collections/high-constdiration-collection',
      'perfumes:morning-collection': '/collections/morning-collection',
      'perfumes:new-collection': '/collections/new-collection',
      'perfumes:perfumes-200ml-150ml': '/collections/200ml-perfumes',
      'perfumes:pheromone': '/collections/pheromone',
      'perfumes:pink-collection': '/collections/pink-wild',
      'perfumes:private-collection': '/collections/private',
      'perfumes:special-offers': '/collections/special-offers',
      'perfumes:summer-collection': '/collections/summer',
      'perfumes:perfumers-choices': '/collections/perfumers-choices',
      'perfumes:the-new-covenant-2026': '/collections/the-new-covenant-2026',
      'perfumes:niche-group': '/collections/niche-group',
      'perfumes:wild-colt-collection': '/collections/wild-colt',
      'perfumes:winter-collection': '/collections/winter-collection',
      'assaf-watches:classic-watches': '/watches/classic',
      'assaf-watches:womens-watches': '/watches/women',
      'assaf-watches:sports-watches': '/watches/sport',
      'veloura-watches:classic-watches': '/watches/classic',
      'veloura-watches:womens-watches': '/watches/women',
      'veloura-watches:sports-watches': '/watches/sport',
      'care-products:care': '/care-products',
      'assaf-sunglasses:women-sunglasses': '/sunglasses/women',
      'assaf-sunglasses:men-sunglasses': '/sunglasses/men',
      'veloura-sunglasses:women-sunglasses': '/sunglasses/women',
      'veloura-sunglasses:men-sunglasses': '/sunglasses/men',
      'assaf-bags:women': '/bags/women',
      'assaf-bags:children': '/bags/children',
      'assaf-bags:promise-bag': '/bags/promise',
      'assaf-bags:promise-bags': '/bags/promise',
      'veloura-bags:women': '/bags/women',
      'veloura-bags:children': '/bags/children',
      'veloura-bags:promise-bag': '/bags/promise',
      'veloura-bags:promise-bags': '/bags/promise',
    };

    const routeKey = `${parentSlug}:${slug}`;
    return subcategoryRouteMap[routeKey] ?? `/collections/${slug}`;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/['’]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toBrandLabel(value: string): string {
    return value.replace(/assaf/gi, 'Veloura').replace(/عساف/g, 'Veloura');
  }

  private shouldExposeChildren(categorySlug: string): boolean {
    return ['perfumes', 'assaf-watches', 'assaf-sunglasses', 'assaf-bags', 'veloura-watches', 'veloura-sunglasses', 'veloura-bags'].includes(categorySlug);
  }

  private sortNavItems(items: NavLinkItem[]): NavLinkItem[] {
    return [...items].sort((left, right) => {
      const leftOrder = NAV_ITEM_ORDER[left.slug] ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = NAV_ITEM_ORDER[right.slug] ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.label.localeCompare(right.label);
    });
  }
}

const FALLBACK_TAXONOMY: TaxonomyApiCategory[] = [
  { name: 'Buy 2 get third free', subcategories: [{ name: 'Buy 2 get third free' }] },
  { name: 'Buy 1 get two free', subcategories: [{ name: 'Buy 1 get two free' }] },
  { name: 'Assaf Discounts', subcategories: [{ name: 'home disc' }, { name: 'Assaf Discouns' }] },
  {
    name: 'Perfumes',
    subcategories: [
      { name: 'Arrogate' },
      { name: 'art-of-detecation-perfumes' },
      { name: 'pegasus collection' },
      { name: 'Topacco collection' },
      { name: 'Dokhur collection' },
      { name: 'Enable Collection' },
      { name: 'Gift of Nobles' },
      { name: 'lady collection' },
      { name: 'High constdiration collection' },
      { name: 'morning collection' },
      { name: 'new collection' },
      { name: 'Perfumes-200ml-150ml' },
      { name: 'Pheromone' },
      { name: 'pink-collection' },
      { name: 'Private Collection' },
      { name: 'Special Offers' },
      { name: 'Summer collection' },
      { name: "Perfumers'-Choices" },
      { name: 'The New Covenant-2026' },
      { name: 'Niche-Group' },
      { name: 'wild-colt-collection' },
      { name: 'winter-collection' },
    ],
  },
  {
    name: 'Assaf Watches',
    subcategories: [{ name: 'classic watches' }, { name: "women's watches" }, { name: 'sports Watches' }],
  },
  { name: 'Care Products', subcategories: [{ name: 'care' }] },
  {
    name: 'Assaf Sunglasses',
    subcategories: [{ name: 'women sunglasses' }, { name: 'men sunglasses' }],
  },
  {
    name: 'Assaf Bags',
    subcategories: [{ name: 'women' }, { name: 'children' }, { name: 'promise bag' }],
  },
  {
    name: 'Home',
    subcategories: [
      { name: 'top releases' },
      { name: 'The-Art-Dedication-home' },
      { name: 'view third section home' },
      { name: 'fragrances-home' },
      { name: 'New Era Begins' },
      { name: 'Next Chapter' },
      { name: 'Arrogate-home' },
      { name: 'gift-benz' },
      { name: 'wild-benz' },
      { name: 'men perfumes' },
      { name: 'women women' },
      { name: 'new chapter' },
      { name: 'discovery-set' },
    ],
  },
];

const VELOURA_BAGS_NAV_ITEMS: TaxonomyApiSubcategory[] = [
  { name: 'Women' },
  { name: 'Children' },
  { name: 'Promise Bags' },
];

const NAV_ITEM_ORDER: Record<string, number> = {
  'buy-2-get-third-free': 1,
  'buy-1-get-two-free': 2,
  'assaf-discounts': 3,
  'veloura-discounts': 3,
  perfumes: 4,
  'assaf-watches': 5,
  'veloura-watches': 5,
  'care-products': 6,
  'assaf-sunglasses': 7,
  'veloura-sunglasses': 7,
  'assaf-bags': 8,
  'veloura-bags': 8,
};
