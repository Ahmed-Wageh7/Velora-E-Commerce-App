import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, from } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, filter, map, take } from 'rxjs/operators';
import { TaxonomyService } from '../../../../core/api/taxonomy.service';

@Component({
  selector: 'app-legacy-collection-redirect',
  template: '',
})
export class LegacyCollectionRedirectComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly taxonomyService = inject(TaxonomyService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const slugCandidates = this.route.snapshot.data['subcategorySlugCandidates'] as string[] | undefined;

    from(slugCandidates ?? [])
      .pipe(
        concatMap((slug) =>
          this.taxonomyService.findSubcategoryBySlug(slug).pipe(
            take(1),
            map((metadata) => metadata?.subcategory ?? null),
          ),
        ),
        filter((subcategory) => subcategory !== null),
        take(1),
        defaultIfEmpty(null),
        concatMap((subcategory) =>
          from(
            this.router.navigateByUrl(
              subcategory ? this.taxonomyService.getSubcategoryRoute(subcategory) : '/',
              { replaceUrl: true },
            ),
          ),
        ),
        catchError(() => {
          void this.router.navigateByUrl('/', { replaceUrl: true });
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
