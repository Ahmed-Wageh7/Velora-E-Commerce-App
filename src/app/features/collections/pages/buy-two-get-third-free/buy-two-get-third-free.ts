import { Component } from '@angular/core';
import { PromoOfferPageComponent } from '../../components/promo-offer-page/promo-offer-page';

@Component({
  selector: 'app-buy-two-get-third-free-page',
  imports: [PromoOfferPageComponent],
  template: `
    <app-promo-offer-page
      pageTitle="Buy 2 Get Third Free"
      breadcrumbLabel="Buy 2 Get Third Free"
      collectionFolder="buy-two-get-third-free"
      descriptionLabel="buy two get third free offer"
      categoryName="Buy 2 get third free"
      subcategoryName="Buy 2 get third free"
      subcategoryId="69d915199e392538306047ea"
      [includeDeletedProducts]="true"
      [fetchAllPages]="true"
      [minimumLoadingMs]="650"
    />
  `,
})
export class BuyTwoGetThirdFreePageComponent {}
