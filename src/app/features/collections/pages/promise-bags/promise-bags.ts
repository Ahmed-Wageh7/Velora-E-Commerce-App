import { Component } from '@angular/core';
import { BagCollectionPageComponent } from '../../components/bag-collection-page/bag-collection-page';

@Component({
  selector: 'app-promise-bags-page',
  imports: [BagCollectionPageComponent],
  template: `
    <app-bag-collection-page
      pageTitle="Veloura Bags | حقيبة برومس"
      breadcrumbLabel="Promise Bags"
      collectionFolder="promise-bags"
      descriptionLabel="promise bag"
      heroImageFile="/collections/promos/promise-bags.webp"
      subcategoryId="69d4fe299e39253830600a70"
      [includeDeletedProducts]="true"
      [fetchAllPages]="true"
      [minimumLoadingMs]="650"
      [useCareShimmer]="true"
      [fullWidthHero]="true"
    />
  `,
})
export class PromiseBagsPageComponent {}
