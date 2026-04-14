import { Component } from '@angular/core';
import { WatchCollectionPageComponent } from '../../components/watch-collection-page/watch-collection-page';

@Component({
  selector: 'app-sport-watches-page',
  imports: [WatchCollectionPageComponent],
  template: `
    <app-watch-collection-page
      pageTitle="Veloura Watches | Sports Watches"
      breadcrumbLabel="Sport Watches"
      collectionFolder="sports-watches"
      descriptionLabel="sport watch"
      heroImageFile="/collections/heroes/sport-watches.webp"
      [fullWidthHero]="true"
      categoryName="Assaf Watches"
      subcategoryName="sports Watches"
      subcategoryId="69d4fe2b9e39253830600a73"
      [includeDeletedProducts]="true"
      [fetchAllPages]="true"
      [minimumLoadingMs]="650"
    />
  `,
})
export class SportWatchesPageComponent {}
