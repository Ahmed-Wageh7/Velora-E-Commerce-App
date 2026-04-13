import { Component } from '@angular/core';
import { SunglassesCollectionPageComponent } from '../../components/sunglasses-collection-page/sunglasses-collection-page';

@Component({
  selector: 'app-arrogate-collection-page',
  imports: [SunglassesCollectionPageComponent],
  template: `
    <app-sunglasses-collection-page
      pageTitle="Perfumes | Arrogate"
      breadcrumbLabel="Arrogate"
      breadcrumbParentLabel="Perfumes"
      collectionFolder="Arrogate-collection"
      descriptionLabel="Arrogate"
      categoryName="Perfumes"
      subcategoryName="Arrogate"
      subcategoryId="69d50edf9e39253830600b30"
      [includeDeletedProducts]="true"
      [fetchAllSubcategoryPages]="true"
      [minimumLoadingMs]="650"
      [hideHero]="true"
      heroImageFile="/perfumes-head.webp"
    />
  `,
})
export class ArrogateCollectionPageComponent {}
