import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth-guard";

const collectionGalleryRoute = () =>
  import("./features/collections/pages/local-collection-gallery/local-collection-gallery").then(
    (module) => module.LocalCollectionGalleryPageComponent,
  );

const legacyCollectionRedirectRoute = () =>
  import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
    (module) => module.LegacyCollectionRedirectComponent,
  );

const legacyCollectionRoutes: Routes = [
  {
    path: "watches/classic",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "classic" },
    title: "Veloura Watches | Classic Watches",
  },
  {
    path: "watches/sport",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "sport" },
    title: "Veloura Watches | Sports Watches",
  },
  {
    path: "watches/women",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "women-watches" },
    title: "Veloura Watches | Women’s Watches",
  },
  {
    path: "bags/women",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "women-bags" },
    title: "Veloura Bags | Women",
  },
  {
    path: "bags/children",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "children-bags" },
    title: "Veloura Bags | Children",
  },
  {
    path: "bags/promise",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "promise-bags" },
    title: "Veloura Bags | حقيبة برومس",
  },
  {
    path: "sunglasses/men",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "men-sunglasses" },
    title: "Veloura Sunglasses | Men’s Sunglasses",
  },
  {
    path: "sunglasses/women",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "women-sunglasses" },
    title: "Veloura Sunglasses | Women’s Sunglasses",
  },
  {
    path: "offers/buy-1-get-2-free",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "buy-1-get-2-free" },
    title: "Buy 1 Get Two Free",
  },
  {
    path: "offers/buy-2-get-third-free",
    loadComponent: legacyCollectionRedirectRoute,
    data: { legacyCollectionSlug: "buy-2-get-third-free" },
    title: "Buy 2 Get Third Free",
  },
  {
    path: "care-products",
    loadComponent: legacyCollectionRedirectRoute,
    data: {
      legacyCollectionSlug: "care-products",
    },
    title: "Care Products | Veloura",
  },
];

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./features/home/pages/home/home").then((module) => module.Home),
    title: "Veloura | Own Your Elegance",
  },
  {
    path: "product/:id",
    loadComponent: () =>
      import("./features/catalog/pages/product-details/product-details").then(
        (module) => module.ProductDetailsPageComponent,
      ),
    title: "Product Details | Veloura",
  },
  {
    path: "checkout",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/checkout/pages/checkout/checkout").then(
        (module) => module.CheckoutPageComponent,
      ),
    title: "Checkout | Veloura",
  },
  {
    path: "checkout/payment",
    redirectTo: "checkout",
    pathMatch: "full",
  },
  {
    path: "auth/signin",
    loadComponent: () =>
      import("./features/auth/pages/auth/auth").then(
        (module) => module.AuthPageComponent,
      ),
    title: "Sign In | Veloura",
  },
  {
    path: "auth/register",
    loadComponent: () =>
      import("./features/auth/pages/auth/auth").then(
        (module) => module.AuthPageComponent,
      ),
    title: "Register | Veloura",
  },
  {
    path: "collections/:subcategoryId/:slug",
    loadComponent: collectionGalleryRoute,
    title: "Collection | Veloura",
  },
  {
    path: "category/:categoryId/:slug",
    loadComponent: collectionGalleryRoute,
    title: "Category | Veloura",
  },
  {
    path: "collections/:slug",
    loadComponent: legacyCollectionRedirectRoute,
    title: "Perfumes | Collection | Veloura",
  },
  ...legacyCollectionRoutes,
  {
    path: "**",
    redirectTo: "",
  },
];
