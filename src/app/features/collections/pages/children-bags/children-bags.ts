import { Component } from '@angular/core';
import { BagCollectionPageComponent } from '../../components/bag-collection-page/bag-collection-page';

@Component({
  selector: 'app-children-bags-page',
  imports: [BagCollectionPageComponent],
  template: `
    <app-bag-collection-page
      pageTitle="Veloura Bags | Children"
      breadcrumbLabel="Children"
      collectionFolder="children-bags"
      descriptionLabel="children bag"
      categoryName="Assaf Bags"
      subcategoryName="children bags"
      subcategoryId="69d4fe299e39253830600a6f"
      [includeDeletedProducts]="true"
      [fetchAllPages]="true"
      [minimumLoadingMs]="650"
      [useCareShimmer]="true"
    />
  `,
})
export class ChildrenBagsPageComponent {}
