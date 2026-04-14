import { Component } from '@angular/core';
import { SunglassesCollectionPageComponent } from '../../components/sunglasses-collection-page/sunglasses-collection-page';

@Component({
  selector: 'app-men-sunglasses-page',
  imports: [SunglassesCollectionPageComponent],
  template: `
    <app-sunglasses-collection-page
      pageTitle="Veloura Sunglasses | Men’s Sunglasses"
      breadcrumbLabel="Men’s Sunglasses"
      collectionFolder="men-sunglasses"
      descriptionLabel="men sunglasses"
      categoryName="Assaf Sunglasses"
      subcategoryName="men sunglasses"
      subcategoryId="69d4fe289e39253830600a6d"
      [includeDeletedProducts]="true"
      [fetchAllSubcategoryPages]="true"
      [minimumLoadingMs]="650"
      [useCareShimmer]="true"
      [heroFullWidth]="true"
      heroImageFile="/collections/heroes/men-sunglasses.webp"
    />
  `,
})
export class MenSunglassesPageComponent {}
