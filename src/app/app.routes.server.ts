import { RenderMode, ServerRoute } from "@angular/ssr";

const legacyCollectionServerRoutes: ServerRoute[] = [
  { path: "watches/classic", renderMode: RenderMode.Server },
  { path: "watches/sport", renderMode: RenderMode.Server },
  { path: "watches/women", renderMode: RenderMode.Server },
  { path: "bags/women", renderMode: RenderMode.Server },
  { path: "bags/children", renderMode: RenderMode.Server },
  { path: "bags/promise", renderMode: RenderMode.Server },
  { path: "sunglasses/men", renderMode: RenderMode.Server },
  { path: "sunglasses/women", renderMode: RenderMode.Server },
  { path: "offers/buy-1-get-2-free", renderMode: RenderMode.Server },
  { path: "offers/buy-2-get-third-free", renderMode: RenderMode.Server },
];

export const serverRoutes: ServerRoute[] = [
  {
    path: "product/:id",
    renderMode: RenderMode.Server,
  },
  {
    path: "collections/:subcategoryId/:slug",
    renderMode: RenderMode.Server,
  },
  {
    path: "collections/:slug",
    renderMode: RenderMode.Server,
  },
  {
    path: "category/:categoryId/:slug",
    renderMode: RenderMode.Server,
  },
  ...legacyCollectionServerRoutes,
  {
    path: "**",
    renderMode: RenderMode.Prerender,
  },
];
