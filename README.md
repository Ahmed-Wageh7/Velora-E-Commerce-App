# Veloura Storefront

A production-oriented Angular storefront for the Veloura brand. The project is built as a multi-page e-commerce frontend with SSR-ready architecture, reusable standalone components, product and collection browsing, cart persistence, checkout scaffolding, backend API integration, and polished interaction details such as animated add-to-cart feedback and custom toast notifications.

## Highlights

- Angular 21 application with SSR-ready setup
- Feature-based architecture across `core`, `shared`, and `features`
- Product details, collection pages, offers, watches, sunglasses, bags, and care products
- Persistent cart with quantity management via `localStorage`
- Frontend auth modal scaffold with session persistence
- Backend API-driven product metadata for multiple sections
- Explicit loading, empty, and error states for major data-driven product surfaces
- Strict TypeScript configuration and reusable service layer

## Tech Stack

- Angular 21
- TypeScript
- Angular SSR
- RxJS
- Tailwind CSS v4
- SCSS
- Vitest
- Express

## Project Status

This repository is production-minded on the frontend, but it is not yet a complete full-stack commerce system.

Already implemented:

- storefront UI and navigation
- collection and product detail flows
- cart persistence and checkout UI scaffolding
- backend API integration for product sections
- frontend request-state handling for loading, empty, and error states

Still pending backend work:

- relational product / collection / order APIs
- real authentication provider and protected user data
- payment processing
- order creation and webhook handling
- production monitoring and CI/CD automation

## Screens and Features

- Home page with branded hero, featured product sections, and promotional banners
- Product details page with quantity picker, related items, image preview, and add-to-cart actions
- Collection pages for fragrances, watches, sunglasses, bags, and offer-driven categories
- Checkout page with cart summary, quantity changes, and guardrails for empty cart or unauthenticated purchase attempts
- Search modal, auth modal, reusable navbar/footer, and custom toast UI

## Architecture

```text
src/app/
  core/
    data/
    layout/
    services/
    ui/
    utils/
  shared/
    components/
  features/
    home/
    catalog/
    collections/
    checkout/
```

### Folder Overview

- `core/services`: shared business logic such as cart state, product retrieval, collection retrieval, toast behavior, and auth scaffolding
- `core/data`: local collection metadata that maps slugs to collection folders and labels
- `core/utils`: cross-cutting utilities such as request-state helpers
- `shared/components`: navbar, footer, header, scroll helpers, and other reusable UI
- `features/*`: page-level and section-level feature implementations

## Data Flow

The storefront currently uses backend APIs under the configured `apiBaseUrl`:

- collection-based sections fetch product metadata from the backend
- the shared product parser prefers the first item in `images[]` as the main image
- `coverImage` is used as the hover image when present
- image URLs are consumed directly from backend responses, with relative paths resolved against the API base

## Recent Improvements

The latest production-readiness pass focused on frontend reliability:

- added shared request-state handling for `loading`, `success`, `empty`, and `error`
- improved product and collection pages so they no longer confuse failed requests with missing products
- added clearer empty/error UI for key storefront sections
- updated the main products service to prefer hosted data and gracefully fall back to local catalog assets

## Environment Variables

The Angular app reads backend requests from `src/environments/environment.ts`.

Current frontend API config:

- `apiBaseUrl`

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm start
```

The app runs locally at `http://localhost:4200/`.

## Available Scripts

```bash
npm start
npm run build
npm run build:production
npm run typecheck
npm run verify
npm test
```

### Script Notes

- `npm start`: local development server
- `npm run build`: default Angular production build
- `npm run build:production`: explicit production configuration build
- `npm run typecheck`: TypeScript application validation
- `npm run verify`: quick production-readiness verification
- `npm test`: unit tests

## Testing

Current test coverage focuses on core application behavior:

- `CartService`
- `ToastService`
- a small set of component creation tests

Run:

```bash
npm test
```

## Deployment

This app is suitable for deployment on Vercel or any platform that supports Angular builds and Node-based SSR hosting.

### Suggested production workflow

1. Run `npm install`
2. Run `npm run verify`
3. Configure public environment values for the deployment target
4. Deploy the Angular build output
5. If using SSR hosting, serve the generated server bundle with Node

### Production checklist

- verify TypeScript passes with `npm run typecheck`
- confirm backend API responses and image URLs are correct
- confirm environment values are correct
- keep all secret keys out of client-exposed files
- test collection pages and product detail routes against hosted data
- add CI/CD, monitoring, and payment/auth backends before launching a real store

## Security Notes

- Public frontend keys should be treated as publishable only.
- The current auth implementation is frontend-scaffolded and is not sufficient for a real production customer account system.
- The current checkout is not a real payment flow and must be backed by a secure server before handling transactions.

## Resume / Portfolio Summary

Built an Angular 21 storefront with SSR-ready architecture, reusable standalone components, backend API product integration, persistent cart state, feature-based code organization, and resilient loading/error handling across product-driven pages.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
