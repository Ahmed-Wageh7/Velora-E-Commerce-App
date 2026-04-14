import { Component } from '@angular/core';
import { SunglassesCollectionPageComponent } from '../../components/sunglasses-collection-page/sunglasses-collection-page';

@Component({
  selector: 'app-frankel-collection-page',
  imports: [SunglassesCollectionPageComponent],
  template: `
    <app-sunglasses-collection-page
      pageTitle="Perfumes | Frankel"
      breadcrumbLabel="Frankel"
      breadcrumbParentLabel="Perfumes"
      collectionFolder="category-frankel"
      descriptionLabel="Frankel"
      categoryName="Perfumes"
      subcategoryName="Frankel"
      subcategoryId="69d506d49e39253830600ace"
      [includeDeletedProducts]="true"
      [fetchAllSubcategoryPages]="true"
      [minimumLoadingMs]="650"
      heroImageFile="/collections/heroes/frankel-collection.jpg"
    />
  `,
})
export class FrankelCollectionPageComponent {}
