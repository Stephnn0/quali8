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
| Campaigns (unlinked coming-soon page) | `app.campaigns._index` | — |
| Legacy campaigns (WIP, unlinked) | `app.campaings.*` | `Campaign` |

> Note: "campaing"/"campaings" is a misspelling that is baked into route folders, the `api.campaing` route, model dir `app/models/app.server/campaings`, and components. Match existing spelling when editing those paths; don't silently "fix" it in one place and break imports.

## OneApp feature library & categories (how the admin is organised)

The app is presented to merchants as **OneApp**: a library of numbered features, each belonging to exactly one **category**. This is the organising rule for the admin UI from now on — every new feature gets a registry entry and a category, and the nav/dashboard/category pages pick it up automatically.

- **Registry:** `app/components/OneApp/features.ts` holds `ONEAPP_CATEGORIES` and `ONEAPP_FEATURES`. Each feature has a two-digit `number`, `key`, `name`, `category`, `tagline`, `description`, `icon`, `image`, `to` (the route it opens), `plan` (`"Free" | "Advance"`, the lowest plan that includes it) and an optional `gate` mirroring the target route's `gatekeepRoute` criteria.
- **Sidebar:** the App Bridge `NavMenu` in `app/routes/app/route.tsx` renders Dashboard, then **one link per category**, then **Delivery** (the delivery hub, `/app/delivery`), Request a Feature and Plans & billing. Individual features are not nav items.
- **Category pages:** `app/routes/app.categories.$category/route.tsx` serves `/app/categories/<key>` and shows a `FeatureShowcaseCard` per feature: the feature illustration, a **plan banner** (Free / Advance plan, plus "Upgrade to unlock" when the shop is gated out), the description, and an "Open <feature>" button that navigates to `to`.
- **Dashboard:** `app/routes/app._index` shows the hero, the feature cards grouped by category (`FeatureGrid`, each group links to its category page), and the "Need another feature?" band. Nothing else lives on the dashboard.
- **Images:** one SVG per feature in `public/features/<key>.svg` (640×400, referenced as `/features/<key>.svg`). Replace a file at the same path to swap in a real screenshot.
- **Feature pages** open with `FeatureHeader featureKey="..."` (index pages) or `FeatureEyebrow` (detail pages) so the numbering stays consistent.

Current categories: **Sales & Pricing** (Smart Shipping, Bundle Builder, Smart Recommendations, Delivery Zones & Rates), **Customers** (Customer Insights), **Content & SEO** (FAQ Collections, SEO AI), **Theme Extensions** (Occasions + Gift Recommendations, Announcements + Delivery Check, Subscribe Boost). Announcements + Delivery Check (key `smart-announcements`), SEO AI, and Subscribe Boost are each **one shop-wide config on one page**, served by the generic `app.features.$feature` route (`/app/features/<key>`); their copy lives in `app/components/Seasonal/featurePages.ts`, their data in `app/services/seasonal/shopFeatureConfig.server.ts` (rows with `specialDateId: null`). The old Sales Calendar routes (`app.special-dates.*`) still schedule date-specific announcement bars and popups and share the schedulers in `app/components/Seasonal/`; they are reachable by URL but not in the nav or the registry. `/app/campaigns` is an unlinked coming-soon page. The Seasonal Hero feature was removed entirely (block, proxy, admin, and the `ScheduledHero` table).

**Subscribe Boost** (feature 08, `/app/features/subscribe-boost`) schedules one shop-wide popup (`SubscribePopup`, edited with `PopupScheduler`) that the theme block `subscribe-popup` (`extensions/theme-quali8/blocks/subscribe-popup.liquid` + `assets/subscribe-popup.js`) shows on the storefront. `proxy.popup` serves the live config (`?preview=1` returns the shop-wide row regardless of dates, code masked, for the theme editor, where the script opens the popup at once and re-renders on `shopify:section:load`/`shopify:block:select`). Signups POST JSON to **`proxy.subscribe`** (`/apps/quali8/subscribe`): `subscribeFromPopup` (`app/services/subscribe/subscribers.server.ts`) saves the shopper in Shopify customers via `subscribeCustomer` (`app/models/shopify.server/customers`: `customerCreate` with SINGLE_OPT_IN consent, or `tagsAdd` + `customerEmailMarketingConsentUpdate` for an existing email; **needs the `write_customers` scope**), records a `PopupSubscriber` row (unique per shop+email, `result` CREATED/UPDATED/FAILED with `lastError`, always tagged `quali8-popup`), and bumps `PopupDailyStat` (views/dismissals/subscribes per shop day; the block also posts `view`/`dismiss` events). The storefront falls back to the theme's `/contact` form only when the app reports it could not save the customer. The feature page shows a Subscribers card (`app/components/Subscribe/SubscriberAnalytics.tsx`, data from `loadSubscribeAnalytics`, pure aggregates in `subscribeAnalytics.ts`, tested) with a `write_customers` warning when the granted session scope lacks it.

**Announcement & delivery bar** is an **app embed** (`announcement-bar.liquid`, `target: "body"`) that the script moves to the top of `<body>` so it shows above the header on every page (or fixed at the bottom). It renders when a scheduled announcement is live *or* the zip code delivery checker is on. The checker's data lives in `DeliveryZone` (zip lists with `*` prefixes, optional price and message) plus `ShopifyStore.deliveryCheckEnabled`, managed on the **Delivery** page (`app.delivery._index`, `app/components/Delivery/DeliveryZonesEditor.tsx`, actions in `app/services/delivery/deliveryZones.server.ts`); matching is the pure `app/services/delivery/deliveryZones.ts` (tested), served by `proxy.delivery-check`, and `proxy.announcement` also reports `deliveryCheck.enabled`.

**Delivery Zones & Rates** (feature 10, sidebar entry Delivery, `app.delivery._index`, `/app/delivery`) is the delivery hub: zones + zip checker switch, the checkout rate, storefront setup instructions, and the carrier service status with an explicit Install button (`detectCarrierService` is read-only on load; `setupCarrierService` runs only from the button). It registers the app as a Shopify **carrier service** (`app/services/carrier/setupCarrierService.server.ts`, name "Quali8 Delivery", callback `SHOPIFY_APP_URL/api/carrier/rates`) and stores the GID on `ShopifyStore.carrierServiceId`. The callback `api.carrier.rates` verifies Shopify's HMAC over the raw body (`hmac.server.ts`) and returns one rate built by the pure `app/services/carrier/rates.ts` (tested) from the same `DeliveryZone`s plus the per-shop `CarrierRate` (title, enabled, fallback price). Registration needs the **`write_shipping` scope** and only succeeds on Shopify plans with carrier-calculated shipping (Advanced, Plus, or any plan billed annually); the page shows the failure reason (missing scope, unsupported plan, or the raw error) instead of redirecting. The cart block `delivery-checkout` (`extensions/theme-quali8/blocks/delivery-checkout.liquid`) is a four-step pre-checkout (Sender → Delivery/Pickup → Options → Review): it gates checkout on the zip check, offers a delivery/pickup **date calendar** driven by `DeliverySchedule` (blocked weekdays/dates, lead time, window; pure rules in `app/services/delivery/deliverySchedule.ts`, tested; admin `DeliveryScheduleEditor`; storefront `proxy.delivery-schedule`), collects card message / notes / occasion (with that occasion's gift picks) on the Options step, validates phone numbers, shows a "keep shopping" state for an empty cart, saves everything to cart attributes (notes also to the cart note), hides the theme's checkout buttons while blocked, and opens checkout with `checkout[shipping_address][...]` prefill parameters. The block is at Shopify's 75-setting cap, so new copy lives as defaults in `delivery-checkout.js`, not as theme settings.

**Alcohol rules** (card on the Delivery page, model `AlcoholRules`, pure `app/services/delivery/alcoholRules.ts`, tested) let a merchant enforce three toggles for products in merchant-picked collections: an **age check** (date of birth + confirmation, saved as cart/order attributes `Date of birth` / `Age confirmed`, minimum age setting, default 21), **local delivery only** (the zip must match a delivery zone; pickup is exempt) and **not sold alone** (at least one non-alcohol line). They are enforced twice: the cart block (rules travel in the `proxy.delivery-schedule` payload as `alcohol`; `proxy.alcohol-check?products=<ids>` says which cart products are alcohol via Admin `Product.inCollection`, pure helpers in `alcoholProducts.ts`; `proxy.delivery-check?zones=1` matches zones even with the checker switch off) and the Cart & Checkout Validation function **`extensions/alcohol-validation`** (target `cart.validations.generate.run`, api 2026-04, tested; its `src/rules.ts` mirrors `evaluateAlcoholCart` and both run `extensions/alcohol-validation/fixtures/rules.json`). `syncAlcoholValidation` (`alcoholValidation.server.ts`) creates/updates the Shopify validation on every save and on zone edits and writes the config (`buildAlcoholValidationConfig`) into its `$app.alcohol-rules` json metafield, whose top-level `collectionIds` also binds the function's input-query variable (`[extensions.input.variables]`). It needs the **`write_validations` scope**, which is added by hand to `shopify.app.toml`; the card shows *Permission missing* / *Not deployed* until the scope is granted and the app version deployed. Functions have no clock, so the function checks presence/format of the age attributes and the block makes the underage decision. The rules are Advance-only; the master switch stays usable on Free so enforcement can always be turned off.

**Recommendations are two features, each with its own theme block.** *Occasions + Gift Recommendations* (`app.occasions.*`, models `Occasion` / `OccasionProduct` / `OccasionCollection`) feeds the product-page block `occasion-gifts` via `proxy.recommendations` and `recommendProducts.server.ts` (curated products + connected collections + tags, topped up from a general pool so occasions are optional). *Smart Recommendations* (`app.recommendations.*`, model `RecommendationRule`) is the **home-page block `smart-recommendations`** (`enabled_on` `index` only) plus the **`smart-tracker` app embed**, which records viewed products and their collections in localStorage (`q8-viewed`) and the first-visit date (`q8-first-seen`) on product pages. The block reads the cart and that storage and calls `proxy.smart-recommendations` with `cart`, `total`, `viewed`, `viewedCollections`, `returning`, `slot` (1–3, so stacked blocks show the 1st/2nd/3rd matching rule) and `limit`; parsing is the pure `shopperParams.ts`. `smartRecommendations.server.ts` (`recommendForShopper`) evaluates rules in position order with the pure `smartRules.ts` (triggers: every visitor / returning visitor / viewed collection / viewed product / cart has collection / cart has product / cart total ≥; sources: collection / tag / newest / picked products / recently viewed / related to viewed; price range; limit), assembles non-repeating rails with the pure `smartRails.ts`, and returns the requested slot; with no rules slot 1 shows the newest products. `RELATED_TO_VIEWED` is resolved in the block: the proxy returns a `related` seed and filters and the block fetches Shopify's public `recommendations/products.json`. The rules index shows theme-editor deep links (`themeEditorLinks.ts`, uid overridable with `SHOPIFY_THEME_EXTENSION_UID`). To add a feature: add the registry entry, drop its image in `public/features/`, and gate its route; to add a category: add it to `ONEAPP_CATEGORIES` and the `OneAppCategoryKey` union.

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

There are exactly two plans: **Free** and **Advance** ($25/mo, 5-day trial, managed-pricing handle `advance`, level `ADVANCE`, seed code `advance-monthly`). **Free is limited, not locked**: it includes Customer Insights (`hasQualifiers`), the announcement bar (`hasAnnouncements`), delivery zones + the zip checker (`hasDeliveryZones`), the subscribe popup (`hasSubscribePopup`, capped at `popupSignupLimit` new subscribers per calendar month, UTC) and bundles (`hasBundles`, capped at `bundleLimit` bundles). Advance has every flag (`hasShippingDiscounts`, `hasRecommendations`, `hasAssistant` as well) and `null` limits (unlimited). The numbers live in `APP_PLANS` (`FREE_BUNDLE_LIMIT`, `FREE_POPUP_SIGNUP_LIMIT` in `app/constants/plans.ts`). The former mid tier **Pro** (level `BASIC`, handle `basic`, codes `pro-monthly`/`pro-annual`) was retired: it is gone from `APP_PLANS`, the seed, and the settings page, but the `BASIC` enum value and any existing DB rows are kept so historical subscriptions still load. Archive the "Basic" plan in the Partner Dashboard as well. After changing plan data, run `npx prisma db seed` locally **and ship a data migration for production**: the Docker image prunes dev dependencies (no `tsx`), so `docker-start` only runs `prisma migrate deploy` and the seed never runs there. A new `RecurringPlan` column added with a default therefore reaches production with that default for every plan (this is how `hasDeliveryZones = false` locked everyone out of the Delivery page; fixed by `20260917013000_plan_flags_data`).

**Limits in the gatekeeper.** Every `<name>Limit` column on `RecurringPlan` becomes a boolean criterion paired with a `<name>Amount` in the current context: `gatekeepRoute({ authAdminContext, amounts: { bundleAmount } }, { bundleLimit: true }, "redirect")` returns `AP020` (bundles) / `AP021` (popup signups) once the amount reaches the plan's limit; the pure helpers are in `app/services/subscriptions/planLimits.ts` (tested). Contexts without an admin session (app proxies, the carrier callback, the discount sync) read the plan with `getShopPlan(shop, db)` (`app/services/subscriptions/shopPlan.server.ts`; no subscription row or a DB error = Free). Where each limit bites: bundles — the `app.bundles.$id` loader/action check the limit for `new`, the index shows the count and disables Create, and `syncBundleDiscounts` + `proxy.bundle` keep only the oldest `bundleLimit` active bundles live (`applyBundleLimit`) so a downgraded shop never shows a bundle checkout charges at full price; popup — `proxy.popup` returns no popup once `signupLimitStatus` is reached (and `subscribeFromPopup` refuses with `limitReached`, which the theme script honours by *not* falling back to `/contact`), and the Subscribe Boost page shows the month's usage. **Delivery** (`app.delivery._index`) loads for every plan: zone actions gate on `hasDeliveryZones`, everything else (calendar, today rules, time windows, cart options, checkout rate, carrier install, method filter) on `hasShippingDiscounts`; the page renders the zones card plus an upgrade banner when `access === "zones"`. `api.carrier.rates` returns no rates and `proxy.delivery-schedule` returns the empty schedule for plans without `hasShippingDiscounts`. The generic feature pages gate per key via `FEATURE_PAGE_GATES` (`featurePages.ts`): announcements → `hasAnnouncements`, subscribe-boost → `hasSubscribePopup`, seo-ai → `hasAssistant`.

### Owner overview (`/app/owner`)
An internal page for the app owner only: every store that ever installed the app with its plan (Free / Advance / legacy Pro), trial state and days left, paying vs. free, uninstalls (with whether the plan was cancelled by uninstall), monthly price and MRR, Shopify plan, country, install date, and the merchant contact (account-owner `Session` email/name while installed, else the `ShopifyShopData` email/owner captured at setup). The loader 404s unless `session.shop` is in `APP.OWNER_SHOPS` (`app/constants/app.constants.ts`, currently the test store `electronics-shopicode.myshopify.com`), and the nav link only renders for those shops (`isOwner` in `app/routes/app/route.tsx`). Classification, summary and filtering are the pure `app/services/owner/ownerOverview.ts` (tested); the Prisma query is `ownerOverview.server.ts`. **Test stores** (owner shops, `STORES_WHITELIST`, `app-review-*` shops, and any store whose Shopify plan display name says development / developer preview / sandbox / staff / partner; `isTestStore`) are badged and kept out of the business counts; "Test stores" tile and filter list them. Each installed row has a **Resync** button: the route action calls `unauthenticated.admin(shop)` and `syncShopifyToAppSubscription` so a shop whose `APP_SUBSCRIPTIONS_UPDATE` webhook was lost gets its plan pulled from Shopify.

**Subscription sync paths.** Three ways a plan reaches `ShopifySubscription`: (1) the enriched sync (`syncShopifyToAppSubscription` → Admin API → `shopifySubscriptionModel.syncSubscription`, which also writes the shop's `$app:env` subscription metafield), run by the `APP_SUBSCRIPTIONS_UPDATE` webhook, by `setupApp` after the store is marked `SETUP`, by `app/routes/app/getSubscription.ts` when the URL carries `subscribed` **or** Shopify's managed-pricing return parameter `charge_id`, and by the owner page's Resync; (2) the **payload fallback** `syncSubscriptionFromPayload` (`app/services/billing.server/`, pure mapper `subscriptionPayload.ts`, tested), which the webhook route uses when the shop has no offline session and the handler uses when the enriched sync throws (typically a 401 from an expired token); it writes the subscription + pricing rows but not the metafield. `appModel.findActiveSubscriptions` **throws** on a non-2xx or GraphQL error instead of returning an empty list, so an expired token is never read as "no subscription".

**Webhook route contract.** `app/routes/webhooks/route.tsx` answers **200 to every authenticated delivery**: handled topics (`APP_UNINSTALLED`, `APP_SUBSCRIPTIONS_UPDATE`, `APP_SCOPES_UPDATE` → updates the offline session's `scope`, `SHOP_REDACT`, the two customer compliance topics), unknown topics (logged, never 404), and handler failures (logged, never 500). Shopify counts any non-2xx as a failed delivery, retries for 48 h, and shows the rate in the Partner Dashboard; the Oct 6–8 2026 "86% failure" was 39 × 500 from the session-table probe during cold starts plus 3 × 404 for `APP_SCOPES_UPDATE`. Only an invalid HMAC (401 from `authenticate.webhook`) is a real failure. **`/health`** (`app/routes/health.tsx`; not `/healthz`, which Google's front end answers itself on *.run.app) re-probes the session table via `sessionStorage.isReady()` and is the Cloud Run startup probe; `RefreshingPrismaSessionStorage` also retries the table probe 12 × 2.5 s at boot.

**Offline tokens expire.** `future.expiringOfflineAccessTokens` is on, so offline tokens die after an hour and the library can only refresh them when the stored session has a `refreshToken`. The stock Prisma session storage dropped it; `app/sessionStorage.server.ts` (`RefreshingPrismaSessionStorage`, columns `Session.refreshToken` / `refreshTokenExpires`, migration `session_refresh_token`) persists it. Sessions created before that migration have no refresh token: once expired they stay dead until the merchant opens the app (token exchange), and `unauthenticated.admin(shop)` returns the stale session without complaint. The owner page shows each store's token state (live / refreshable / expired / no session) and disables Resync when the app cannot act alone.

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
