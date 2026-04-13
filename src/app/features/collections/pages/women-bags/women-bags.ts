import { Component } from '@angular/core';
import { BagCollectionPageComponent } from '../../components/bag-collection-page/bag-collection-page';

@Component({
  selector: 'app-women-bags-page',
  imports: [BagCollectionPageComponent],
  template: `
    <app-bag-collection-page
      pageTitle="Veloura Bags | Women"
      breadcrumbLabel="Women"
      collectionFolder="women-bags"
      descriptionLabel="women bag"
      categoryName="Assaf Bags"
      subcategoryName="women bags"
      subcategoryId="69d4fe299e39253830600a6e"
      [includeDeletedProducts]="true"
      [fetchAllPages]="true"
      [minimumLoadingMs]="650"
      [useCareShimmer]="true"
    />
  `,
})
export class WomenBagsPageComponent {}
