import { Component } from "@angular/core";
import { WatchCollectionPageComponent } from "../../components/watch-collection-page/watch-collection-page";

@Component({
  selector: "app-women-watches-page",
  imports: [WatchCollectionPageComponent],
  template: `
    <app-watch-collection-page
      pageTitle="Veloura Watches | Women's Watches"
      breadcrumbLabel="Women's Watches"
      collectionFolder="women-watches"
      descriptionLabel="women watch"
      heroImageFile="women-head-for-watches.webp"
      [fullWidthHero]="true"
      categoryName="Assaf Watches"
      subcategoryName="women's watches"
      subcategoryId="69d4fe2a9e39253830600a72"
      [includeDeletedProducts]="true"
      [fetchAllPages]="true"
      [minimumLoadingMs]="650"
    />
  `,
})
export class WomenWatchesPageComponent {}
