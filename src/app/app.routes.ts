import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/pages/home/home').then((module) => module.Home),
    title: 'Veloura | Own Your Elegance',
  },
  {
    path: 'product/:folder/:id',
    loadComponent: () =>
      import('./features/catalog/pages/product-details/product-details').then(
        (module) => module.ProductDetailsPageComponent,
      ),
    title: 'Product Details | Veloura',
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./features/catalog/pages/product-details/product-details').then(
        (module) => module.ProductDetailsPageComponent,
      ),
    title: 'Product Details | Veloura',
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./features/checkout/pages/checkout/checkout').then((module) => module.CheckoutPageComponent),
    title: 'Checkout | Veloura',
  },
  {
    path: 'checkout/payment',
    loadComponent: () =>
      import('./features/checkout/pages/stripe-payment/stripe-payment').then(
        (module) => module.StripePaymentPageComponent,
      ),
    title: 'Secure Payment | Veloura',
  },
  {
    path: 'auth/signin',
    loadComponent: () => import('./features/auth/pages/auth/auth').then((module) => module.AuthPageComponent),
    title: 'Sign In | Veloura',
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/pages/auth/auth').then((module) => module.AuthPageComponent),
    title: 'Register | Veloura',
  },
  {
    path: 'care-products',
    loadComponent: () =>
      import('./features/collections/pages/care-products/care-products').then(
        (module) => module.CareProductsPageComponent,
      ),
    title: 'Care Products | Veloura',
  },
  {
    path: 'collections/arrogate',
    loadComponent: () =>
      import('./features/collections/pages/arrogate-collection/arrogate-collection').then(
        (module) => module.ArrogateCollectionPageComponent,
      ),
    title: 'Perfumes | Arrogate | Veloura',
  },
  {
    path: 'collections/frankel',
    loadComponent: () =>
      import('./features/collections/pages/frankel-collection/frankel-collection').then(
        (module) => module.FrankelCollectionPageComponent,
      ),
    title: 'Perfumes | Frankel | Veloura',
  },
  {
    path: 'collections/pink-wild',
    loadComponent: () =>
      import('./features/collections/pages/pink-collection/pink-collection').then(
        (module) => module.PinkCollectionPageComponent,
      ),
    title: 'Perfumes | Pink Wild | Veloura',
  },
  {
    path: 'collections/:slug',
    loadComponent: () =>
      import('./features/collections/pages/local-collection-gallery/local-collection-gallery').then(
        (module) => module.LocalCollectionGalleryPageComponent,
      ),
    title: 'Perfumes | Collection | Veloura',
  },
  {
    path: 'watches/classic',
    loadComponent: () =>
      import('./features/collections/pages/classic-watches/classic-watches').then(
        (module) => module.ClassicWatchesPageComponent,
      ),
    title: 'Veloura Watches | Classic Watches',
  },
  {
    path: 'watches/sport',
    loadComponent: () =>
      import('./features/collections/pages/sport-watches/sport-watches').then(
        (module) => module.SportWatchesPageComponent,
      ),
    title: 'Veloura Watches | Sports Watches',
  },
  {
    path: 'watches/women',
    loadComponent: () =>
      import('./features/collections/pages/women-watches/women-watches').then(
        (module) => module.WomenWatchesPageComponent,
      ),
    title: 'Veloura Watches | Women’s Watches',
  },
  {
    path: 'bags/women',
    loadComponent: () =>
      import('./features/collections/pages/women-bags/women-bags').then((module) => module.WomenBagsPageComponent),
    title: 'Veloura Bags | Women',
  },
  {
    path: 'bags/children',
    loadComponent: () =>
      import('./features/collections/pages/children-bags/children-bags').then(
        (module) => module.ChildrenBagsPageComponent,
      ),
    title: 'Veloura Bags | Children',
  },
  {
    path: 'bags/promise',
    loadComponent: () =>
      import('./features/collections/pages/promise-bags/promise-bags').then(
        (module) => module.PromiseBagsPageComponent,
      ),
    title: 'Veloura Bags | حقيبة برومس',
  },
  {
    path: 'sunglasses/men',
    loadComponent: () =>
      import('./features/collections/pages/men-sunglasses/men-sunglasses').then(
        (module) => module.MenSunglassesPageComponent,
      ),
    title: 'Veloura Sunglasses | Men’s Sunglasses',
  },
  {
    path: 'sunglasses/women',
    loadComponent: () =>
      import('./features/collections/pages/women-sunglasses/women-sunglasses').then(
        (module) => module.WomenSunglassesPageComponent,
      ),
    title: 'Veloura Sunglasses | Women’s Sunglasses',
  },
  {
    path: 'offers/buy-1-get-2-free',
    loadComponent: () =>
      import('./features/collections/pages/buy-one-get-two-free/buy-one-get-two-free').then(
        (module) => module.BuyOneGetTwoFreePageComponent,
      ),
    title: 'Buy 1 Get Two Free',
  },
  {
    path: 'offers/buy-2-get-third-free',
    loadComponent: () =>
      import('./features/collections/pages/buy-two-get-third-free/buy-two-get-third-free').then(
        (module) => module.BuyTwoGetThirdFreePageComponent,
      ),
    title: 'Buy 2 Get Third Free',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
