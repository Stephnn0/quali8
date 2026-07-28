# Bundle checkout discounts — design

**Date:** 2026-07-27 · **Branch:** `claude-integration` · **Status:** approved (chat)

## Problem

The bundles ("Frequently Bought Together") feature is presentational only. The
theme block renders discounted prices and adds the variants to the cart via
`/cart/add.js` with a `_quali8_bundle: <bundleId>` line-item property — but no
Shopify discount exists for bundles, so cart and checkout charge full price.

## Design

Register **one automatic app discount per shop** backed by a **new discount
Function** that applies the bundle percentage to qualifying cart lines at
checkout. The storefront needs no changes: the `_quali8_bundle` line property
it already writes is the grouping hook.

### 1. Function extension `extensions/bundle-discounts`

- TypeScript function on the modern **Discount API** (`api_version 2026-04`),
  single target `cart.lines.discounts.generate.run` (the existing
  `shipping-discounts` extension uses the deprecated
  `purchase.shipping-discount.run` target and is untouched).
- Input query reads: cart lines (`id`, `quantity`,
  `attribute(key: "_quali8_bundle")`, merchandise variant GID) and
  `discount { discountClasses, metafield(key: "quali8_bundle_discounts") { jsonValue } }`.
- Logic per bundle group found in the cart:
  1. Group lines by the `_quali8_bundle` attribute value; look the id up in the
     metafield config. Unknown id or missing config → no discount.
  2. Keep only lines whose variant is actually in that bundle's item list
     (a shopper faking the property on another product gets nothing).
  3. Require the **complete bundle**: for every configured item, the summed
     quantity of matching lines ≥ the required quantity. Incomplete → no
     discount for that group (removing an item in cart self-revokes the deal).
  4. Emit one `ProductDiscountCandidate` per complete bundle: targets = the
     matching lines, value = `percentage`, message = bundle title.
- Return a single `productDiscountsAdd` operation with
  `selectionStrategy: ALL` (verified: `ALL` exists on
  `ProductDiscountSelectionStrategy`) so several bundles with different
  percentages can discount at once.
- Guard: return no operations unless `input.discount.discountClasses`
  includes `PRODUCT`.
- Whole matching lines are discounted; extra quantity of a bundle item beyond
  the required amount is also discounted (generous v1, keeps targets simple).
- Vitest unit tests colocated in the extension (mirrors `shipping-discounts`).
- `schema.graphql` seeded from Shopify's `function-examples` repo; refresh
  with `npm run typegen` / `shopify app function schema` when authenticated.

### 2. Discount + metafield lifecycle (one discount per shop)

Why one shared discount, not one per bundle: Shopify caps active automatic
discounts (~25/shop) and a single discount makes sync trivial.

- Config metafield (`key: quali8_bundle_discounts`, `type: json`, app-reserved
  namespace — same pattern the shipping function proves out):

  ```json
  {
    "bundles": [
      { "id": 1, "title": "Camera kit", "discountPercent": 15,
        "items": [ { "variantId": "gid://shopify/ProductVariant/123", "quantity": 2 } ] }
    ]
  }
  ```

- `app/services/bundles/bundleDiscountSync.server.ts` —
  `syncBundleDiscounts(session, db)` runs after every bundle mutation:
  - No active bundles → delete the automatic discount (ignore not-found),
    clear `ShopifyStore.bundleDiscountId`.
  - Active bundles, no stored discount id → `discountAutomaticAppCreate` with
    `functionHandle: "bundle-discounts"`, `discountClasses: [PRODUCT]`,
    `combinesWith { orderDiscounts: false, productDiscounts: false,
    shippingDiscounts: true }`, and the config metafield; store the returned
    `discountId`.
  - Otherwise → `metafieldsSet` on the stored discount id; if that fails
    because the merchant deleted the discount manually, recreate it.
  - Pure `buildBundleDiscountConfig()` is unit-tested at the app level.
- Admin API calls go through `createAdminApiClient` pinned to `2026-04`
  (same pattern as `app/models/shopify.server/app/index.ts`) because the
  app's default client pins `January25`, which predates `discountClasses` /
  `functionHandle`. Using `functionHandle` also avoids a second
  `getFunctionId` lookup and its first-match ambiguity.

### 3. Schema change

`ShopifyStore.bundleDiscountId String?` + hand-written migration (follows the
existing bundle migrations' style). No backfill needed.

### 4. Wiring

- `app.bundles.$id` action (POST create / PUT update) and
  `app.bundles._index` action (PATCH status / DELETE) call
  `syncBundleDiscounts` after the DB write. A sync failure does not roll back
  the save; it returns an explicit error so the merchant knows checkout won't
  discount yet.
- Update the now-outdated "checkout always charges the live variant price"
  comments and document the function contract in `CLAUDE.md`.

## Edge cases

- Same variant in two bundles → distinct cart lines (different property
  values), each judged in its own group.
- Bundle added twice → Ajax cart merges lines; ≥-quantity check still passes.
- Discount deleted by merchant in admin → next bundle save recreates it.
- Function config missing/malformed → function returns empty operations
  (never breaks checkout).

## Out of scope

Cart Transform ("true bundle" single line), fixed-amount bundles, per-bundle
discount objects, gatekeeping/billing for the bundles feature, auto-sync on a
schedule (sync happens on admin mutations only).
