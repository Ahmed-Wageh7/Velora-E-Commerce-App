import { Routes } from '@angular/router';
import { Home } from './features/home/pages/home/home';
import { AuthPageComponent } from './features/auth/pages/auth/auth';
import { ProductDetailsPageComponent } from './features/catalog/pages/product-details/product-details';
import { CheckoutPageComponent } from './features/checkout/pages/checkout/checkout';
import { CareProductsPageComponent } from './features/collections/pages/care-products/care-products';
import { ArrogateCollectionPageComponent } from './features/collections/pages/arrogate-collection/arrogate-collection';
import { FrankelCollectionPageComponent } from './features/collections/pages/frankel-collection/frankel-collection';
import { PinkCollectionPageComponent } from './features/collections/pages/pink-collection/pink-collection';
import { LocalCollectionGalleryPageComponent } from './features/collections/pages/local-collection-gallery/local-collection-gallery';
import { ClassicWatchesPageComponent } from './features/collections/pages/classic-watches/classic-watches';
import { SportWatchesPageComponent } from './features/collections/pages/sport-watches/sport-watches';
import { WomenWatchesPageComponent } from './features/collections/pages/women-watches/women-watches';
import { WomenBagsPageComponent } from './features/collections/pages/women-bags/women-bags';
import { ChildrenBagsPageComponent } from './features/collections/pages/children-bags/children-bags';
import { PromiseBagsPageComponent } from './features/collections/pages/promise-bags/promise-bags';
import { MenSunglassesPageComponent } from './features/collections/pages/men-sunglasses/men-sunglasses';
import { WomenSunglassesPageComponent } from './features/collections/pages/women-sunglasses/women-sunglasses';
import { BuyOneGetTwoFreePageComponent } from './features/collections/pages/buy-one-get-two-free/buy-one-get-two-free';
import { BuyTwoGetThirdFreePageComponent } from './features/collections/pages/buy-two-get-third-free/buy-two-get-third-free';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Veloura | Own Your Elegance',
  },
  {
    path: 'product/:folder/:id',
    component: ProductDetailsPageComponent,
    title: 'Product Details | Veloura',
  },
  {
    path: 'product/:id',
    component: ProductDetailsPageComponent,
    title: 'Product Details | Veloura',
  },
  {
    path: 'checkout',
    component: CheckoutPageComponent,
    title: 'Checkout | Veloura',
  },
  {
    path: 'auth/signin',
    component: AuthPageComponent,
    title: 'Sign In | Veloura',
  },
  {
    path: 'auth/register',
    component: AuthPageComponent,
    title: 'Register | Veloura',
  },
  {
    path: 'care-products',
    component: CareProductsPageComponent,
    title: 'Care Products | Veloura',
  },
  {
    path: 'collections/arrogate',
    component: ArrogateCollectionPageComponent,
    title: 'Perfumes | Arrogate | Veloura',
  },
  {
    path: 'collections/frankel',
    component: FrankelCollectionPageComponent,
    title: 'Perfumes | Frankel | Veloura',
  },
  {
    path: 'collections/pink-wild',
    component: PinkCollectionPageComponent,
    title: 'Perfumes | Pink Wild | Veloura',
  },
  {
    path: 'collections/:slug',
    component: LocalCollectionGalleryPageComponent,
    title: 'Perfumes | Collection | Veloura',
  },
  {
    path: 'watches/classic',
    component: ClassicWatchesPageComponent,
    title: 'Veloura Watches | Classic Watches',
  },
  {
    path: 'watches/sport',
    component: SportWatchesPageComponent,
    title: 'Veloura Watches | Sports Watches',
  },
  {
    path: 'watches/women',
    component: WomenWatchesPageComponent,
    title: 'Veloura Watches | Women’s Watches',
  },
  {
    path: 'bags/women',
    component: WomenBagsPageComponent,
    title: 'Veloura Bags | Women',
  },
  {
    path: 'bags/children',
    component: ChildrenBagsPageComponent,
    title: 'Veloura Bags | Children',
  },
  {
    path: 'bags/promise',
    component: PromiseBagsPageComponent,
    title: 'Veloura Bags | حقيبة برومس',
  },
  {
    path: 'sunglasses/men',
    component: MenSunglassesPageComponent,
    title: 'Veloura Sunglasses | Men’s Sunglasses',
  },
  {
    path: 'sunglasses/women',
    component: WomenSunglassesPageComponent,
    title: 'Veloura Sunglasses | Women’s Sunglasses',
  },
  {
    path: 'offers/buy-1-get-2-free',
    component: BuyOneGetTwoFreePageComponent,
    title: 'Buy 1 Get Two Free',
  },
  {
    path: 'offers/buy-2-get-third-free',
    component: BuyTwoGetThirdFreePageComponent,
    title: 'Buy 2 Get Third Free',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
