import { Component } from '@angular/core';
import { PromoOfferPageComponent } from '../../components/promo-offer-page/promo-offer-page';

@Component({
  selector: 'app-buy-one-get-two-free-page',
  imports: [PromoOfferPageComponent],
  template: `
    <app-promo-offer-page
      pageTitle="Buy 1 Get Two Free"
      breadcrumbLabel="Buy 1 Get Two Free"
      collectionFolder="buy-one-get2-free"
      descriptionLabel="buy one get two free offer"
      categoryName="Buy 1 get two free"
      subcategoryName="Buy 1 get two free"
      subcategoryId="69d9151a9e392538306047eb"
      [includeDeletedProducts]="true"
      [fetchAllPages]="true"
      [minimumLoadingMs]="650"
    />
  `,
})
export class BuyOneGetTwoFreePageComponent {}
