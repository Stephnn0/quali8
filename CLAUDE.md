# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

**Quali8** is an embedded Shopify admin app that lets merchants create **shipping discounts targeted at specific customer audiences**. The flow:

1. **Audiences** (model: `Qualifiers`) — customer segments defined by a set of `Conditions` (e.g. `customer_tag equals VIP`, `customer_order_count greater_than 3`) combined with AND/OR logic.
2. **Promotions** (model: `ShippingDiscountAction`) — a shipping discount (percentage or fixed, code-based or automatic) applied to one or more Audiences, with options like minimum cart value, selected vs. all shipping rates, and start/end dates.
3. A **Shopify Function** (`extensions/shipping-discounts`) enforces the discount at checkout. When a Promotion is created, the app creates a Shopify app discount tied to the store's `functionId` and writes the promotion config into a discount metafield; the function reads that metafield at runtime and decides which delivery options get discounted.

### Terminology mapping (UI label → code)
The nav labels do **not** match the model/route names — keep this straight:

| UI label | Route prefix | Prisma model |
|----------|--------------|--------------|
| Audiences | `app.qualifiers.*` | `Qualifiers` |
| Promotions | `app.actions.discounts.*` | `ShippingDiscountAction` |
| Bundles | `app.bundles.*` | `Bundle` |
| Subscriptions | `app.settings._index` | `ShopifySubscription` |
| Campaigns (WIP, nav link hidden) | `app.campaings.*` | `Campaign` |

> Note: "campaing"/"campaings" is a misspelling that is baked into route folders, the `api.campaing` route, model dir `app/models/app.server/campaings`, and components. Match existing spelling when editing those paths; don't silently "fix" it in one place and break imports.

## OneApp feature library & categories (how the admin is organised)

The app is presented to merchants as **OneApp**: a library of numbered features, each belonging to exactly one **category**. This is the organising rule for the admin UI from now on — every new feature gets a registry entry and a category, and the nav/dashboard/category pages pick it up automatically.

- **Registry:** `app/components/OneApp/features.ts` holds `ONEAPP_CATEGORIES` and `ONEAPP_FEATURES`. Each feature has a two-digit `number`, `key`, `name`, `category`, `tagline`, `description`, `icon`, `image`, `to` (the route it opens), `plan` (`"Free" | "Advance"`, the lowest plan that includes it) and an optional `gate` mirroring the target route's `gatekeepRoute` criteria.
- **Sidebar:** the App Bridge `NavMenu` in `app/routes/app/route.tsx` renders Dashboard, then **one link per category**, then Request a Feature and Plans & billing. Individual features are not nav items.
- **Category pages:** `app/routes/app.categories.$category/route.tsx` serves `/app/categories/<key>` and shows a `FeatureShowcaseCard` per feature: the feature illustration, a **plan banner** (Free / Advance plan, plus "Upgrade to unlock" when the shop is gated out), the description, and an "Open <feature>" button that navigates to `to`.
- **Dashboard:** `app/routes/app._index` shows the hero, the feature cards grouped by category (`FeatureGrid`, each group links to its category page), and the "Need another feature?" band. Nothing else lives on the dashboard.
- **Images:** one SVG per feature in `public/features/<key>.svg` (640×400, referenced as `/features/<key>.svg`). Replace a file at the same path to swap in a real screenshot.
- **Feature pages** open with `FeatureHeader featureKey="..."` (index pages) or `FeatureEyebrow` (detail pages) so the numbering stays consistent.

Current categories: **Sales & Pricing** (Smart Shipping, Bundle Builder), **Customers** (Customer Insights, Subscribe Boost), **Content & SEO** (FAQ Collections, SEO AI), **Seasonal Marketing** (Occasion Match, Smart Announcements, Sales Calendar). To add a feature: add the registry entry, drop its image in `public/features/`, and gate its route; to add a category: add it to `ONEAPP_CATEGORIES` and the `OneAppCategoryKey` union.

## Stack

- **React Router 7** in framework mode (migrated from Remix — use `@shopify/shopify-app-react-router`, **not** any `@remix-run/*` runtime package) + **Vite 6**
- **Polaris 12** + **App Bridge React 4** for the embedded admin UI
- **Prisma 6** + **PostgreSQL**
- **Shopify Functions** (TypeScript → wasm) for the checkout-time discount logic
- **Shopify CLI** (`@shopify/cli`) drives dev/deploy/codegen
- Deploys to **Fly.io** via Docker (`fly.toml`, `Dockerfile`)

## Commands

Developing requires the **Shopify CLI**, a **Shopify Partner account**, and a configured **dev store**. `npm run dev` opens an authenticated tunnel and installs the app on the dev store.

```bash
npm run dev            # shopify app dev — runs the app + tunnel + extensions (the normal dev loop)
npm run build          # react-router build (production bundle)
npm run lint           # eslint
npm run setup          # prisma generate && prisma migrate deploy
npm run deploy         # shopify app deploy — pushes extensions + app config to Shopify
npm run generate       # shopify app generate — scaffold a new extension
```

Under the hood `shopify app dev` honors `shopify.web.toml`: it runs `npx prisma generate` (predev) then `prisma migrate deploy && react-router dev`. A local Postgres is expected at `DATABASE_URL`; `development/postgresql.sh` helps spin one up.

### Database (Prisma)
```bash
npx prisma migrate dev --name <description>   # create + apply a migration in dev
npx prisma migrate deploy                     # apply pending migrations (prod/CI)
npx prisma db seed                            # runs tsx ./prisma/seed/index.ts — seeds RecurringPlan rows
npx prisma studio                             # inspect the DB
```
`RecurringPlan` (billing plans) is **seeded data**, managed only by seed/admins — the app reads it but must not create/update/delete it.

### GraphQL codegen
Admin GraphQL queries live in `app/models/shopify.server/graphql/*.ts` (written with a leading `#graphql` comment for autocomplete). After changing them, regenerate types:
```bash
npm run graphql-codegen     # regenerates app/types/admin.types.* and admin.generated.d.ts
```
Each extension with a `schema.graphql` is its own codegen project (see `.graphqlrc.ts`).

### Shopify Function (extensions/shipping-discounts)
This is the only place with unit tests (Vitest). From `extensions/shipping-discounts/`:
```bash
npm run typegen        # shopify app function typegen — regenerates generated/api.ts from run.graphql
npm run build          # compiles src/run.ts → dist/function.wasm
npm test               # vitest (run a single test: npx vitest run src/run.test.ts -t "name")
npm run preview        # shopify app function run — execute the function against sample input
```

## Architecture

### Route structure (flat routes)
Routing is **file-based via `@react-router/fs-routes` `flatRoutes()`** (`app/routes.ts`). Folders use dot-notation for nesting (`app.qualifiers.$id`, `api.actions.discounts`). A route folder is typically decomposed as:
- `route.tsx` — `loader`, `action`, default component, `ErrorBoundary`, `headers`
- `loader/`, `action/` — server-only data fetching / mutations, kept out of `route.tsx`
- `hooks/`, `components/`, `types.ts`, `zod.ts` — client logic, UI, types, validation

`app/routes/app/route.tsx` is the authenticated layout shell (Polaris + App Bridge providers + `NavMenu`). `api.*` routes are JSON endpoints called by fetchers; `app.*` routes render UI.

### Two model layers (`app/models/`)
Keep these separated — don't call Prisma from a `shopify.server` module or hit Shopify from an `app.server` module:
- **`app/models/shopify.server/*`** — wraps the **Shopify Admin GraphQL API** (shop info, customers, discounts, functions, app subscriptions, metafields).
- **`app/models/app.server/*`** — wraps **our Postgres via Prisma** (qualifiers, conditions, customers, shopifyStore, campaings, shopifySubscriptions, actionShippingDiscounts).

### Services (`app/services/`)
Orchestration that combines both model layers:
- **`setup/`** — the install/setup flow (see below).
- **`billing.server/`** — syncs Shopify `AppSubscription` state into our `ShopifySubscription`.
- **`subscriptions/gatekeep/`** — feature gating.

### Authentication
Every server `loader`/`action` starts with `await authenticate.admin(request)` (from `app/shopify.server`). The returned context exposes `admin.graphql`, `session.shop`, and `redirect`. Session storage is Prisma-backed (`Session` model). Webhooks authenticate via `authenticate.webhook(request)` in `app/routes/webhooks/route.tsx`.

### Setup flow (INSTALLED → SETUP)
`getAppStatus` (`app/services/setup/getAppStatus.ts`) checks the `ShopifyStore` row on every `/app` load. If the row is missing or `status !== "SETUP"`, it **redirects to `/setup`**, which runs `setupApp`: creates the store, resolves the Shopify `functionId` via `getFunctionId`, sets up the subscription metafield, then marks the store `SETUP`. **Every `ShopifyStore` must have a `functionId`** — it's required by the discount-create mutations (`discounts.server.ts` throws `"Function ID not found"` without it). `functionId` is only written on store *creation*; `app/routes/app/route.tsx` self-heals a missing one by re-fetching and persisting it.

### Subscriptions & gatekeeping
Billing uses Shopify's `AppSubscription`, mirrored into our `ShopifySubscription` (+ `RecurringPlan`/`ShopifyRecurringPricing`). `gatekeep()` (`app/services/subscriptions/gatekeep/gatekeep.ts`) returns a gate `code` (or `null` to allow) based on criteria like plan level, dev-store whitelist, and feature flags (`hasQualifiers`, `hasShippingDiscounts`, `hasBundles`). `gatekeepRoute()` runs it in a loader and, when blocked, redirects to `/app/gatekeep?code=<CODE>`. Client-side gating uses `useGatekeepFeature`.

There are exactly two plans: **Free** and **Advance** ($25/mo, 5-day trial, managed-pricing handle `advance`, level `ADVANCE`, seed code `advance-monthly`). Free includes Customer Insights only; Advance includes every feature flag (`hasShippingDiscounts`, `hasBundles`, `hasRecommendations`, `hasAssistant`). The former mid tier **Pro** (level `BASIC`, handle `basic`, codes `pro-monthly`/`pro-annual`) was retired: it is gone from `APP_PLANS`, the seed, and the settings page, but the `BASIC` enum value and any existing DB rows are kept so historical subscriptions still load. Archive the "Basic" plan in the Partner Dashboard as well. **Bundles are Advance-only** (`hasBundles`): the `app.bundles.*` loaders/actions gatekeep with `{ hasBundles: true }` (code `AP014`), the `proxy.bundle` route and `syncBundleDiscounts` check `shopHasBundles()` (works without an admin session), so a downgrade hides the storefront card and tears down the automatic discount on the next bundle mutation. After changing plan data, run `npx prisma db seed`.

### The Function contract (important)
`extensions/shipping-discounts/src/run.ts` reads its config from `input.discountNode.metafield.value` and parses it into `ParsedBody` (`src/types.ts`). The shape the app writes when creating a discount (in `api.actions.discounts`) **must stay in sync** with `ParsedBody`, or the function will silently produce empty discounts. The function checks, in order: minimum cart value → customer eligibility (`appliesToAllCustomers` or customer ID in list) → shipping rate selection (`ALL_RATES` vs `SELECTED_RATES`) → discount value (`percentage` vs `fixed`). Because the extension runs on the modern discounts API (api_version 2026-04), the create mutations must set `discountClasses: [SHIPPING]` and therefore run on a raw `createAdminApiClient` pinned to `2026-04` in `discounts.server.ts` — same pattern as bundles below.

### Bundles checkout discount
Bundles ("Frequently Bought Together") get their checkout discount from a **second function**, `extensions/bundle-discounts` (modern Discount API, target `cart.lines.discounts.generate.run`, api_version 2026-04). The storefront block adds bundle variants to the cart with a `_quali8_bundle: <bundleId>` line property; the function applies the bundle's percentage to those lines **only while the complete bundle is in the cart**. There is **one automatic app discount per shop** (`ShopifyStore.bundleDiscountId`), kept in sync by `syncBundleDiscounts` (`app/services/bundles/bundleDiscountSync.server.ts`), which runs after every bundle admin mutation and writes the config into the `quali8_bundle_discounts` json metafield. Contract: `buildBundleDiscountConfig` (`app/services/bundles/bundleDiscountConfig.ts`) ↔ `BundleDiscountConfig` (`extensions/bundle-discounts/src/types.ts`) — keep them in sync or the function silently produces no discounts. The discount mutations run on a raw `createAdminApiClient` pinned to `2026-04` (`bundleDiscounts.server.ts`) because the default admin client's January25 predates `discountClasses`/`functionHandle`.

## Conventions & gotchas

- **Never touch `shopify.app.toml`, `shopify.app.toml.md`, or any local variant of them (`shopify.app.toml.dev`, `shopify.app.toml.dd`, …).** These are the developer's app-config files, swapped by hand between the dev and production Shopify apps; the variants are local backups and must never be committed, modified, or deleted by tooling or agents. Stage files explicitly instead of `git add -A` so working-tree changes to them are never swept into a commit.

- **Imports use the `app/...` alias** (baseUrl `.`, resolved by `vite-tsconfig-paths`), e.g. `import db from "app/db.server"`. There is no `~` alias.
- **`*.server.ts` / `app.server` / `shopify.server`** suffixes mark server-only code — never import them into client components.
- TypeScript `strict` is on. There is a meaningful amount of `as any` at form/fetcher boundaries; prefer proper typing for new code rather than copying those casts.
- **API version drift**: `app/shopify.server.ts` pins `ApiVersion.January25`, while `shopify.app.toml` webhooks and the extensions declare `2026-04`, and GraphQL codegen uses `LATEST_API_VERSION`. Be deliberate about which version you target when adding queries/webhooks.
- This project started from the `@shopify/shopify-app-template-remix` template (see `CHANGELOG.md`), then migrated to React Router 7 — ignore Remix-era patterns in older references.
