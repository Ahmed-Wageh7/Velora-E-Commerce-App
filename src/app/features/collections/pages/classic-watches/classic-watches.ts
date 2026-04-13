import { Component } from '@angular/core';
import { WatchCollectionPageComponent } from '../../components/watch-collection-page/watch-collection-page';

@Component({
  selector: 'app-classic-watches-page',
  imports: [WatchCollectionPageComponent],
  template: `
    <app-watch-collection-page
      pageTitle="Veloura Watches | Classic Watches"
      breadcrumbLabel="Classic Watches"
      collectionFolder="classic-watches"
      descriptionLabel="classic watch"
      categoryName="Assaf Watches"
      subcategoryName="classic watches"
      subcategoryId="69d4fe2a9e39253830600a71"
      [includeDeletedProducts]="true"
      [fetchAllPages]="true"
      [minimumLoadingMs]="650"
    />
  `,
})
export class ClassicWatchesPageComponent {}
