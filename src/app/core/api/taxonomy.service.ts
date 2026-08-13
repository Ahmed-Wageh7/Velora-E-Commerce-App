import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { buildCategoriesUrl, extractCategories } from './product-api.utils';
import { TaxonomyApiResponse } from '../../models/product/product-api.model';
import { NavLinkItem, TaxonomyApiCategory, TaxonomyApiSubcategory } from '../../models/taxonomy/taxonomy.model';

@Injectable({
  providedIn: 'root',
})
export class TaxonomyService {
  private readonly http = inject(HttpClient);

  private readonly categories$: Observable<TaxonomyApiCategory[]> = this.http.get<TaxonomyApiResponse>(buildCategoriesUrl()).pipe(
    map((response) => extractCategories(response)),
    catchError(() => of([] as TaxonomyApiCategory[])),
    shareReplay(1),
  );

  private readonly navItems$ = this.categories$.pipe(
    map((categories) =>
      this.sortNavItems(categories.map((category) => this.toNavLinkItem(category)).filter((item): item is NavLinkItem => item !== null)),
    ),
    shareReplay(1),
  );

  getCategories(): Observable<TaxonomyApiCategory[]> {
    return this.categories$;
  }

  getNavItems(): Observable<NavLinkItem[]> {
    return this.navItems$;
  }

  getSubcategoryRoute(subcategory: TaxonomyApiSubcategory): string {
    const subcategoryId = subcategory._id ?? subcategory.id ?? '';
    return `/collections/${subcategoryId}/${this.getEntitySlug(subcategory)}`;
  }

  findSubcategoryById(subcategoryId: string): Observable<{ category: TaxonomyApiCategory; subcategory: TaxonomyApiSubcategory } | null> {
    return this.categories$.pipe(
      map((categories) => {
        for (const category of categories) {
          const subcategory = (category.subcategories ?? []).find((item: TaxonomyApiSubcategory) => (item._id ?? item.id) === subcategoryId);

          if (subcategory) {
            return { category, subcategory };
          }
        }

        return null;
      }),
    );
  }

  findSubcategoryBySlug(slug: string): Observable<{ category: TaxonomyApiCategory; subcategory: TaxonomyApiSubcategory } | null> {
    const normalizedSlug = this.normalizeSlug(slug);

    return this.categories$.pipe(
      map((categories) => {
        for (const category of categories) {
          const subcategory = (category.subcategories ?? []).find((item: TaxonomyApiSubcategory) => this.getEntitySlug(item) === normalizedSlug);

          if (subcategory) {
            return { category, subcategory };
          }
        }

        return null;
      }),
    );
  }

  findCategoryById(categoryId: string): Observable<TaxonomyApiCategory | null> {
    return this.categories$.pipe(
      map((categories) => categories.find((category) => (category._id ?? category.id) === categoryId) ?? null),
    );
  }

  findCategoryBySlug(slug: string): Observable<TaxonomyApiCategory | null> {
    const normalizedSlug = this.normalizeSlug(slug);

    return this.categories$.pipe(
      map((categories) => categories.find((category) => this.getEntitySlug(category) === normalizedSlug) ?? null),
    );
  }

  private toNavLinkItem(category: TaxonomyApiCategory): NavLinkItem | null {
    const rawLabel = category.name.trim();
    const label = this.toBrandLabel(rawLabel);
    const slug = this.getEntitySlug(category);

    if (slug === 'home') {
      return null;
    }

    const categoryId = category._id ?? category.id ?? slug;
    const children = this.getNavChildren(rawLabel, categoryId, category.subcategories ?? []);

    return {
      id: categoryId,
      label,
      slug,
      categoryId,
      route: `/category/${categoryId}/${slug}`,
      children,
    };
  }

  private getNavChildren(
    categoryName: string,
    categoryId: string,
    subcategories: TaxonomyApiSubcategory[],
  ): NavLinkItem[] {
    return subcategories
      .filter((subcategory) => this.slugify(subcategory.name) !== 'home')
      .map((subcategory) => this.toSubcategoryNavLinkItem(categoryName, categoryId, subcategory));
  }

  private toSubcategoryNavLinkItem(parentCategoryName: string, parentCategoryId: string, subcategory: TaxonomyApiSubcategory): NavLinkItem {
    const rawLabel = subcategory.name.trim();
    const label = this.toBrandLabel(rawLabel);
    const slug = this.getEntitySlug(subcategory);

    return {
      id: subcategory._id ?? subcategory.id ?? `${this.slugify(parentCategoryName)}-${slug}`,
      label,
      slug,
      categoryId: subcategory.category || parentCategoryId,
      subcategoryId: subcategory._id ?? subcategory.id ?? '',
      route: this.getSubcategoryRoute(subcategory),
      children: [],
    };
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

  private getEntitySlug(entity: { name: string; slug?: string }): string {
    return this.normalizeSlug(entity.slug || entity.name);
  }

  private normalizeSlug(value: string): string {
    return this.slugify(value);
  }

  private toBrandLabel(value: string): string {
    return value.replace(/assaf/gi, 'Veloura').replace(/عساف/g, 'Veloura');
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

const NAV_ITEM_ORDER: Record<string, number> = {
  'buy-2-get-third-free': 1,
  'buy-1-get-two-free': 2,
  'assaf-discounts': 3,
  'veloura-discounts': 3,
  'perfumes': 4,
  'assaf-watches': 5,
  'veloura-watches': 5,
  'care-products': 6,
  'assaf-sunglasses': 7,
  'veloura-sunglasses': 7,
  'assaf-bags': 8,
  'veloura-bags': 8,
};
