# Smart Recommendations — design plan

Date: 2026-07-28 · Status: awaiting approval, no code yet

## What we're building

Product recommendations on the storefront driven by five signals — occasion,
season, budget, previous purchases, recipient — surfaced through new theme
app blocks on the cart page and the product page, with merchant-defined
"special occasions" managed in the app admin.

## Approach decision

Three ways to power recommendations:

1. **Rules + curation (recommended for v1).** Merchants curate products per
   occasion and/or use a tag convention; the engine scores candidates with
   deterministic weights (occasion match, season, budget fit, recipient
   match, purchase affinity, in stock). Predictable, testable, zero external
   cost or latency, no App Store review complications.
2. Shopify's native product recommendations as a candidate source, re-ranked
   by our rules. Good add-on to v1 where candidates are thin.
3. LLM/embeddings ("true AI"). Real cost, latency, and review burden —
   defer until v1 proves demand.

v1 = option 1 with option 2 as a fallback candidate source.

**"Customer or merchant creates occasions":** v1 ships merchant-created
occasions; the *shopper* selects an occasion/recipient/budget in the widget
(no account needed). Customer-saved personal occasions ("Mom's birthday,
May 3" + reminders) require customer-account UX and per-customer storage —
that's a meaningful phase 2, not v1.

## Data model (new, all shop-owned)

- **`Occasion`** — name, slug, status (ACTIVE/INACTIVE), optional recurring
  date window (startMonth/startDay/endMonth/endDay — recurring yearly, unlike
  the one-shot global `Holiday` model the WIP Campaigns use), sortOrder,
  shop FK. Seeded starter set per shop on first visit (Valentine's Day,
  Mother's Day, Birthday, Anniversary, Sympathy, Just Because…) — editable.
- **`OccasionProduct`** — curated product snapshot rows (productId GID,
  title, image, price, position), mirroring `BundleItem`'s resource-picker
  snapshot pattern.
- **`RecommendationSettings`** (one row per shop) — enabled surfaces
  (product page / cart), budget bands (e.g. "Under $50 / $50–100 / $100+",
  merchant-editable), recipient options (starter set: For her / For him /
  For mom / For a friend / Corporate — merchant-editable list), hemisphere
  for season derivation.

Tag conventions supplement curation: `q8:occasion:<slug>`,
`q8:recipient:<slug>`, `q8:season:<spring|summer|fall|winter>`. Curated
lists win; tags widen the pool. Budget always derives from live price.

## Recommendation engine

`app/services/recommendations/` — pure, unit-tested scoring separated from
data fetching:

- `getCandidates()` — union of: curated `OccasionProduct`s, Admin GraphQL
  products by tag query, and (product-page context) Shopify related
  products. Excludes items already in the cart and, when the shopper is
  logged in, exact products they already bought.
- `scoreProducts()` — pure function, weighted sum over the five signals;
  season from date + hemisphere; budget = price within selected band;
  previous purchases = product type/vendor affinity from the customer's
  recent orders (Admin API, via the proxy-provided `logged_in_customer_id`).
  Vitest coverage like `customerInsights`/`queryEngine`.
- Returns top N (default 4) with a "reason" chip per product ("Perfect for
  Mother's Day", "Within your budget") — merchants love explainability and
  it makes the widget feel smart.

## Storefront surfaces (extensions/theme-quali8)

Follows the bundles block pattern exactly (hidden until data arrives, zero
layout shift, colors/labels as block settings, never surfaces errors):

- **`blocks/recommendations-product.liquid`** (product template) — "picker"
  header (occasion select, recipient chips, budget band) + product cards.
  Defaults pre-selected from the active occasion window (e.g. the week
  before Mother's Day auto-selects it).
- **`blocks/recommendations-cart.liquid`** (cart template) — "Complete your
  gift": recommendations based on cart contents + selected occasion +
  remaining budget (band minus cart subtotal). Note: app blocks render on
  the cart *page*; theme-specific cart drawers can't host app blocks — a
  documented limitation, not a blocker.
- Shared `assets/recommendations.js/.css`; add-to-cart via `/cart/add.js`
  like bundles.

## Proxy

`app/routes/proxy.recommendations/` — `authenticate.public.appProxy`,
reached at `/apps/quali8/recommendations?context=product|cart&product_id=…
&cart=…&occasion=…&recipient=…&budget=…`. Shopify appends
`logged_in_customer_id` for the previous-purchases signal. Entitlement
check + `Cache-Control: public, max-age=60` for shopper-agnostic requests
(no caching when personalized). Never errors to the storefront.

## Admin UI

- New nav item **Occasions** → `app.occasions._index` (list: name, window,
  products count, status, active-now badge) and `app.occasions.$id`
  (name, date window, curated products via resource picker, status).
- **Recommendation settings** card (budget bands, recipients, surfaces
  on/off, hemisphere) — on the occasions index or under Settings.
- Gatekeeping: new `hasRecommendations` flag on `RecurringPlan` (same
  mechanism as `hasBundles`). Suggested split: Free = 1 active occasion +
  product-page block; Pro = unlimited occasions + cart block + previous-
  purchases personalization. (Decide before seeding.)

## Build order (each phase lands as its own PR)

1. **Schema + seeds** — Occasion/OccasionProduct/RecommendationSettings
   migration, per-shop starter occasions, `hasRecommendations` plan flag.
2. **Admin CRUD** — occasions list/editor + settings card + gatekeeping.
3. **Engine** — candidates + scoring + vitest suite.
4. **Proxy** — endpoint + entitlement + caching.
5. **Theme blocks** — product page first, then cart; screenshot review.
6. **Verification** — unit tests, `npm run build`, manual pass on the dev
   store with `shopify app dev`, then `npm run deploy` for the extension.

## Open decisions (assumed defaults, flag if you want different)

1. Plan gating: limited free tier + full Pro (assumed) vs all-Pro vs all-free.
2. Customer-saved personal occasions: deferred to phase 2 (assumed).
3. AI ranking: deferred; rules v1 (assumed).
4. Recipient/budget options: merchant-editable lists with sensible seeds
   (assumed) vs fixed sets.
