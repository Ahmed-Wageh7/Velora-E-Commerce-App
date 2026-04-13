import { Component } from '@angular/core';
import { SunglassesCollectionPageComponent } from '../../components/sunglasses-collection-page/sunglasses-collection-page';

@Component({
  selector: 'app-women-sunglasses-page',
  imports: [SunglassesCollectionPageComponent],
  template: `
    <app-sunglasses-collection-page
      pageTitle="Veloura Sunglasses | Women’s Sunglasses"
      breadcrumbLabel="Women’s Sunglasses"
      collectionFolder="women-sunglasses"
      descriptionLabel="women sunglasses"
      categoryName="Sunglasses"
      subcategoryName="women sunglasses"
      subcategoryId="69d4fe289e39253830600a6c"
      [fetchAllSubcategoryPages]="true"
      [includeDeletedProducts]="true"
      [minimumLoadingMs]="650"
      [useCareShimmer]="true"
      [heroFullWidth]="true"
      heroImageFile="/women-head.webp"
    />
  `,
})
export class WomenSunglassesPageComponent {}
