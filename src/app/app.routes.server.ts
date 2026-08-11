import { RenderMode, ServerRoute } from "@angular/ssr";

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
  {
    path: "**",
    renderMode: RenderMode.Prerender,
  },
];
