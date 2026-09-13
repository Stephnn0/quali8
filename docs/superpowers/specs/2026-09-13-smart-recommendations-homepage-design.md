# Smart Recommendations on the home page — design

Date: 2026-09-13 · Status: approved, no code yet

## What we're building

Smart Recommendations moves out of the delivery-checkout cart block and
becomes its own theme app block on the **home page**. A companion app embed
records what shoppers view on product pages so the home page rail can react
to browsing, not only to the cart. Rules gain browsing-based triggers and
sources, and a merchant can stack several rails on the home page.

Decisions taken during brainstorming:

- **Move, don't duplicate.** The rail leaves the cart block's Options step.
  Smart Recommendations has exactly one storefront surface: the home page.
- **Signals: cart + recently viewed + returning visitor.** Not cart-only,
  not rule lists without signals.
- **Approach A:** block + tracker embed, new triggers and sources including
  "related to what they viewed" through Shopify's native recommendations
  endpoint, and a "Rail" slot setting for stacking rails.

## Storefront

### 1. `smart-recommendations` app block (home page)

`extensions/theme-quali8/blocks/smart-recommendations.liquid`, with
`smart-recommendations.js` and `smart-recommendations.css` in `assets/`.

- `target: "section"`, `enabled_on.templates: ["index"]`. Same pattern as
  Occasions + Gifts: a single root element with `data-quali8-smart-recs`,
  CSS variables from the theme settings, and `hidden` until it has content
  (zero layout shift).
- Liquid passes `data-currency`, `data-slot`, and `data-limit`; the rest of
  the settings become CSS variables and `data-*` copy attributes.
- **Settings (looks only, plus two behaviour switches).** Roughly 20
  settings and at most 6 `header`/`paragraph` entries (Shopify's cap):
  - `rail` select: "1st matching rule" / "2nd matching rule" / "3rd
    matching rule" (default 1st). Lets a merchant add the block up to three
    times to stack rails.
  - `products` range: how many cards, 2–12, default 4.
  - `fallback_heading` text: used when the matched rule has no heading
    (default "You might also like").
  - `layout` select: "Sideways rail" / "Grid".
  - `card_width` range, `show_price` checkbox, `button_style` select,
    `add_label`, `view_label` text.
  - Colours: block background, text, accent, button, button text.
  - Spacing & shape: padding, block radius, card radius, show border.
- **Script behaviour** (`smart-recommendations.js`, vanilla, no innerHTML
  with remote data, same conventions as `occasion-gifts.js`):
  1. Read the cart from `ROOT + "cart.js"` (product ids and `total_price`
     in the shop currency, converted from cents).
  2. Read the tracker's localStorage keys (see §2): `q8-viewed` (array of
     `{ id, collections, at }`) and `q8-first-seen` (ISO date).
     `returning` is true when `q8-first-seen` exists and is not today's
     local date.
  3. `GET ROOT + "apps/quali8/smart-recommendations?cart=…&total=…&viewed=…
     &viewedCollections=…&returning=1|0&slot=n&limit=n"`. Viewed ids are
     numeric, newest first, capped at 12; viewed collection ids capped at
     24.
  4. If the response carries `related`, fetch
     `ROOT + "recommendations/products.json?product_id=<seed>&limit=<n>
     &intent=related"` and apply the rule's filters client-side (exclude
     cart items, min/max price, limit). Product JSON from that endpoint
     provides `id`, `handle`, `title`, `price` (cents), `featured_image`,
     `variants[0].id`, `available`.
  5. Render the rail: heading (rule heading or fallback), then one card per
     product: image and title link to `ROOT + "products/" + handle`, price,
     and a quick **Add** button posting `{ id: variantId, quantity: 1 }` to
     `ROOT + "cart/add.js"`; when no variant id is known the button is
     **View** and links to the product. After a successful add the button
     reads "Added", disables, and a `cart:refresh` CustomEvent is
     dispatched on `document` so themes with cart drawers can react.
  6. Any failure, empty product list, or a non-matching slot keeps the
     block `hidden`.

### 2. `smart-tracker` app embed

`extensions/theme-quali8/blocks/smart-tracker.liquid` with
`smart-tracker.js`, `target: "body"`, name "Smart recs tracker" (under the
25-character embed name limit). One `paragraph` setting explaining what it
does; nothing else.

- Liquid renders a single empty element `data-quali8-tracker`. On product
  templates it adds `data-product-id="{{ product.id }}"` and
  `data-collection-ids="{{ product.collections | map: 'id' | join: ',' }}"`.
- Script, on every page: if `q8-first-seen` is missing, store today's ISO
  date (`YYYY-MM-DD`, browser local). On product pages: prepend
  `{ id, collections: [...], at: Date.now() }` to `q8-viewed`, remove any
  earlier entry with the same id, cap at 12. All storage access wrapped in
  try/catch.
- Without the embed enabled the block still works, but only cart-based and
  "always" rules can fire; `RECENTLY_VIEWED` and `RELATED_TO_VIEWED` produce
  nothing. The admin page says so (see §5).

### 3. Leaving the cart block

In `delivery-checkout.js`: remove `fetchRecommendations`, the Smart
Recommendations fetch and container in the Options step, and the
`recsHeading` / `recsIntro` defaults. **Keep** `renderRecs`, the
`.q8-dc__recs*` / `.q8-dc__rec*` CSS, and the `addLabel` / `addingLabel` /
`addedLabel` defaults: the occasion-products rail on the same step uses
them. Update the block's header comment (line "3) Options (…, Smart
Recommendations upsell)") and any Options-step copy that mentions
recommendations.

## Data and rules

### 4. Schema (one Prisma migration, enum additions only)

```prisma
enum RecommendationTrigger {
  ALWAYS
  CART_HAS_COLLECTION
  CART_HAS_PRODUCT
  CART_TOTAL_MIN
  VIEWED_COLLECTION   // new: shopper viewed a product in this collection
  VIEWED_PRODUCT      // new: shopper viewed this product
  RETURNING_VISITOR   // new: first seen before today
}

enum RecommendationSource {
  COLLECTION
  TAG
  NEWEST
  PRODUCTS
  RECENTLY_VIEWED     // new: the products they viewed, newest first
  RELATED_TO_VIEWED   // new: Shopify related products for the most recently viewed product
}
```

`VIEWED_COLLECTION` and `VIEWED_PRODUCT` reuse `triggerCollectionId/Title`
and `triggerProductId/Title`. No new columns.

### 5. Pure rules (`app/services/recommendations/smartRules.ts`, tested)

`CartFacts` becomes `ShopperFacts`:

```ts
type ShopperFacts = {
  productIds: string[];          // cart product GIDs
  collectionIds: string[];       // collections of cart products (may be [])
  total: number | null;          // cart subtotal, shop currency
  viewedProductIds: string[];    // GIDs, newest first
  viewedCollectionIds: string[]; // GIDs
  returning: boolean;
};
```

- `ruleMatches` handles the three new triggers.
- New `pickRules(rules, facts): T[]` returns every matching rule in
  position order; `pickRule` stays as `pickRules(...)[0] ?? null`.
- `needsCollections` is unchanged (only cart triggers need the Admin API
  lookup; viewed collections arrive from the tracker).

### 6. Server (`smartRecommendations.server.ts`)

`recommendForCart` becomes `recommendForShopper(db, graphql, request)` with
`request = { shop, cartProductIds, cartTotal, viewedProductIds,
viewedCollectionIds, returning, slot, maxProducts }` (flat, so the parsed
proxy params map onto it one-to-one).

- No rules → newest products, `fallbackUsed: true`, only for slot 1
  (slots 2 and 3 return empty).
- Otherwise: `matched = pickRules(rules, facts)`. If
  `matched.length < slot` → empty. Resolve sources for `matched[0..slot-1]`
  in order, applying each rule's exclude-cart, price range and limit;
  products already used by an earlier slot are skipped so stacked rails
  never repeat. Return the slot's rail.
- New sources: `RECENTLY_VIEWED` → `getProductsByIds(viewedProductIds)`
  keeping viewed order. `RELATED_TO_VIEWED` → no server resolution; the
  response carries `related: { seedProductId: "<numeric>", limit, minPrice,
  maxPrice, excludeCartItems }` and `products: []`. When the viewed list is
  empty the rule is treated as not matching (skipped) so a later rule can
  fill the slot. A `RELATED_TO_VIEWED` rail cannot dedupe against
  server-resolved earlier slots; the block excludes cart items only. This
  is accepted.
- Response shape:

```ts
type SmartRecommendationResponse = {
  products: SmartRecommendedProduct[];
  heading: string | null;
  ruleId: number | null;
  fallbackUsed: boolean;
  related?: { seedProductId: string; limit: number; minPrice: number | null;
              maxPrice: number | null; excludeCartItems: boolean };
};
```

### 7. Proxy (`app/routes/proxy.smart-recommendations`)

Query parsing moves into a pure, tested helper
`app/services/recommendations/shopperParams.ts` (`parseShopperParams(url)`):
`cart`, `total`, `limit` (1–12, default 4), `viewed` (≤12 numeric ids),
`viewedCollections` (≤24), `returning` (`"1"` → true), `slot` (1–3, default
1). Numeric ids become GIDs (`gid://shopify/Product/…`,
`gid://shopify/Collection/…`). The route keeps `Cache-Control: public,
max-age=60`; the URL includes every signal, so the cache key is correct.
Entitlement check (`shopHasRecommendations`) and the empty-payload error
path are unchanged.

## Admin

### 8. Rules UI and copy

- `app.recommendations.$id`: trigger select gains "Shopper viewed a product
  from collection…", "Shopper viewed product…", "Returning visitor";
  source select gains "Recently viewed products" and "Related to what they
  viewed". Existing collection/product pickers are reused for the viewed
  triggers. Zod/action validation accepts the new enum values.
- `app.recommendations._index` loader: `when` / `show` descriptions for the
  new values ("Viewed a product from Vases", "Viewed Peony Bouquet",
  "Returning visitor"; "Recently viewed", "Related to what they viewed").
- Index page gets a **Setup** card: "Add the Smart Recommendations block to
  your home page" and "Turn on the Smart recs tracker embed so viewed
  products count", each with a theme-editor deep link:
  `https://{shop}/admin/themes/current/editor?context=apps&template=index&addAppBlockId={extensionUid}/smart-recommendations&target=newAppsSection`
  and `…/editor?context=apps&activateAppId={extensionUid}/smart-tracker`.
  The extension uid is the `uid` in `extensions/theme-quali8/shopify.extension.toml`
  (read from `SHOPIFY_THEME_EXTENSION_UID` env with that value as the
  fallback, so a dev app with a different uid can override it).
- Copy: the index page comment and intro, `features.ts` entry 09 (tagline
  "Home page recommendations driven by your rules.", description mentioning
  the home page block and the tracker), and CLAUDE.md's
  "Recommendations are two features" paragraph.

## Testing

- `smartRules.test.ts`: new triggers (match / no match / null ids),
  `pickRules` ordering and multiple matches, `RETURNING_VISITOR`.
- `shopperParams.test.ts`: defaults, caps, non-numeric ids dropped, slot
  clamping.
- `smartRecommendations.server.ts` is exercised through the existing
  pattern (no DB tests in this repo); the slot dedupe and related payload
  logic are kept in small pure helpers inside the module where practical so
  they can be unit tested without Prisma or GraphQL.
- Manual: `npm run dev`, enable the embed and add the block in the theme
  editor on the dev store; view a product, return home, confirm the rail;
  add a second block on slot 2; confirm the cart block's Options step no
  longer shows the rail. Extension changes reach merchants only via
  `npm run deploy`.

## Out of scope

- Customer-account signals (order count, purchased products) as triggers.
- A recommendations rail on collection or product pages.
- Analytics on rail impressions or adds.
- Migrating existing rules: the enum additions leave existing rows valid.
