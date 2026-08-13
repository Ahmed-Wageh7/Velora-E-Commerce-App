import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth-guard";

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
    loadComponent: () =>
      import("./features/collections/pages/local-collection-gallery/local-collection-gallery").then(
        (module) => module.LocalCollectionGalleryPageComponent,
      ),
    title: "Collection | Veloura",
  },
  {
    path: "category/:categoryId/:slug",
    loadComponent: () =>
      import("./features/collections/pages/local-collection-gallery/local-collection-gallery").then(
        (module) => module.LocalCollectionGalleryPageComponent,
      ),
    title: "Category | Veloura",
  },
  {
    path: "care-products",
    loadComponent: () =>
      import("./features/collections/pages/care-products/care-products").then(
        (module) => module.CareProductsPageComponent,
      ),
    title: "Care Products | Veloura",
  },
  {
    path: "collections/arrogate",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["arrogate", "arrogate-collection"] },
    title: "Perfumes | Arrogate | Veloura",
  },
  {
    path: "collections/frankel",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["frankel", "category-frankel", "frankel-collection"] },
    title: "Perfumes | Frankel | Veloura",
  },
  {
    path: "collections/pink-wild",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["pink-wild", "pink-collection"] },
    title: "Perfumes | Pink Wild | Veloura",
  },
  {
    path: "collections/:slug",
    loadComponent: () =>
      import("./features/collections/pages/local-collection-gallery/local-collection-gallery").then(
        (module) => module.LocalCollectionGalleryPageComponent,
      ),
    title: "Perfumes | Collection | Veloura",
  },
  {
    path: "watches/classic",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["classic-watches", "classic"] },
    title: "Veloura Watches | Classic Watches",
  },
  {
    path: "watches/sport",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["sport-watches", "sports-watches", "sport"] },
    title: "Veloura Watches | Sports Watches",
  },
  {
    path: "watches/women",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["women-watches", "womens-watches"] },
    title: "Veloura Watches | Women’s Watches",
  },
  {
    path: "bags/women",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["women-bags", "womens-bags"] },
    title: "Veloura Bags | Women",
  },
  {
    path: "bags/children",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["children-bags", "children"] },
    title: "Veloura Bags | Children",
  },
  {
    path: "bags/promise",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["promise-bags", "promise"] },
    title: "Veloura Bags | حقيبة برومس",
  },
  {
    path: "sunglasses/men",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["men-sunglasses", "mens-sunglasses"] },
    title: "Veloura Sunglasses | Men’s Sunglasses",
  },
  {
    path: "sunglasses/women",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["women-sunglasses", "womens-sunglasses"] },
    title: "Veloura Sunglasses | Women’s Sunglasses",
  },
  {
    path: "offers/buy-1-get-2-free",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["buy-1-get-2-free", "buy-1-get-two-free", "buy-one-get-two-free", "buy-one-get2-free"] },
    title: "Buy 1 Get Two Free",
  },
  {
    path: "offers/buy-2-get-third-free",
    loadComponent: () =>
      import("./features/collections/pages/legacy-collection-redirect/legacy-collection-redirect").then(
        (module) => module.LegacyCollectionRedirectComponent,
      ),
    data: { subcategorySlugCandidates: ["buy-2-get-third-free", "buy-two-get-third-free"] },
    title: "Buy 2 Get Third Free",
  },
  {
    path: "**",
    redirectTo: "",
  },
];
