# Plan: Delivery Checkout block + Carrier Service

Date: 2026-09-13. Status: implemented 2026-09-13 (both parts); see the owner actions below before it works on a store.

## Goal

1. A **cart-page theme block** that reuses the Smart Recommendations rail and
   adds a delivery gate: the shopper enters a zip code and shipping address,
   the backend checks the zip against the merchant's delivery zones, and only
   when delivery is available do they see a **Checkout** button that opens
   checkout with the address already filled in.
2. A **Carrier Service** registered by the app so Shopify asks our backend for
   shipping rates at checkout, priced by zip using the same delivery zones
   ("custom logic" later). Kept simple for v1: one rate per matching zone.

Reference implementation for the carrier service: the nuflorist app
(`/home/system-1/Music/8instruments/quali88/nuflorist-official`), files
`app/services/setupApp/carrierService/setupCarrierService.server.ts`,
`app/routes/api.public.carrier-service.rates/*`, and
`app/utils/.server/hmacAuthentication.ts`.

## What already exists in Quali8 (reuse, don't rebuild)

- `DeliveryZone` model + `ShopifyStore.deliveryCheckEnabled`, managed on the
  Announcements + Delivery Check page (`DeliveryZonesEditor`), matched by the
  pure `app/services/delivery/deliveryZones.ts` (tested), served by
  `proxy.delivery-check`.
- The cart block `smart-recommendations` (rail/grid/list, one-tap add).
- The gift-notes block already saves fields to cart attributes via
  `/cart/update.js` (pattern to copy for the address form).
- Gatekeep code `SF002` ("not supported third-party carrier rate") is already
  declared in `app/services/subscriptions/gatekeep/types.ts` but unused.
- Scope `read_shipping` is granted. **`write_shipping` is not** (needed to
  create a carrier service) — see "Merchant/owner actions".

## Part A — Delivery Checkout block (cart page)

### Data

No new tables. Address values are saved as **cart attributes** (they ride to
the order as "Additional details"):

| Attribute            | Field         |
|----------------------|---------------|
| `Delivery zip`       | zip / postal  |
| `Delivery name`      | first + last  |
| `Delivery address`   | address1      |
| `Delivery address 2` | address2      |
| `Delivery city`      | city          |
| `Delivery province`  | province code |
| `Delivery country`   | country code  |
| `Delivery phone`     | phone         |

Also `Delivery zone` (matched zone name) and `Delivery price` for the
merchant's reference.

### Backend

- Reuse `proxy.delivery-check` unchanged (`?zip=` → deliverable, zone, price).
- Optional: extend it to accept `country` so zones can be country-scoped
  later (v1: ignore).

### Theme block `blocks/delivery-checkout.liquid` (cart only)

One block, three states, rendered by `assets/delivery-checkout.js` with
`assets/delivery-checkout.css` (same conventions: settings JSON blob, DOM via
`createElement`, CSS variables, ≤ 6 schema headers, name ≤ 25 chars).

1. **Zip step.** Prompt + zip input + Check. Calls `delivery-check`. Not
   deliverable → message (with the merchant's "we don't deliver there yet"
   copy) and the theme's own checkout button stays hidden (the block adds
   `q8-dc-blocked` to `<html>`; CSS hides `[name="checkout"]` and
   `.shopify-payment-button` inside the cart form while blocked — a setting
   `hide_theme_checkout` toggles this because some themes need a different
   selector; a `checkout_selector` text setting lets merchants override).
2. **Address step** (deliverable). Shows the zone result (price/message) and
   the address form: first name, last name, address1, address2, city,
   province (select from a country→provinces map for US/CA; text elsewhere),
   country (select, default from `localization.country`), phone (optional).
   Zip is prefilled and locked (Change link goes back to step 1). Values save
   to cart attributes as they type (debounced, same as gift-notes).
3. **Checkout button.** Enabled when required fields are valid. On click
   builds the checkout URL with the documented prefill params and navigates:
   `/checkout?checkout[email]=…&checkout[shipping_address][first_name]=…
   &…[last_name]&…[address1]&…[address2]&…[city]&…[province]&…[zip]&…[country]`
   (province and country as codes). Phone is not a documented prefill param;
   it stays in attributes only.

Smart Recommendations rail: the block includes an optional
"Show recommendations above the address form" toggle that mounts a
`[data-quali8-smart-recs]` element and reuses `smart-recommendations.js`/`.css`
(both assets are referenced by the block's schema; Shopify allows one
`javascript` and one `stylesheet` per block, so the delivery block imports
the rail by **concatenating** at build time — simplest: `delivery-checkout.js`
contains a copy of the rail renderer, or the merchant adds both blocks. v1:
**two blocks stacked** (Smart Recommendations above, Delivery Checkout below)
and no code duplication; revisit if merchants ask for one block).

Settings (headers: Content · Zip check · Address form · Checkout · Colors ·
Spacing & shape): headings and every string, which address fields are shown
and required, `hide_theme_checkout` + `checkout_selector`, remember zip, and
the usual colours/radii/padding.

Known limits to document in the settings paragraph: prefill does not apply to
Shop Pay / Apple Pay / Google Pay buttons (hide them while blocked too, or
they'd bypass the gate), and a first-visit prefill display bug exists in
Shopify's checkout (data is saved; form sometimes shows blank until refresh).

### Admin

Add a "Delivery checkout" section on the Announcements + Delivery Check page
that links to the theme editor and explains the gate. No new routes.

## Part B — Carrier Service (rates by zip)

### Prerequisites (owner actions, cannot be done by the agent)

1. Add `write_shipping` to `scopes` in `shopify.app.toml` and redeploy the
   config (`npm run deploy`); existing installs must re-authorize the new
   scope (the app already subscribes to `app/scopes_update`).
2. Shopify only calls third-party carrier services on stores with the
   **carrier-calculated shipping** feature: Advanced/Plus, or any plan billed
   **annually** (Shopify adds the feature on request for annual plans). The
   app detects support by attempting `carrierServiceCreate`; a store without
   the feature gets a `userErrors` response and the page shows gate `SF002`.

### Data

```
model CarrierRate {          // one per shop for v1
  id, shop (unique), enabled Boolean, title String ("Local delivery"),
  fallbackPrice Float?      // when no zone matches; null = no rate returned
  createdAt/updatedAt
}
ShopifyStore.carrierServiceId String?   // GID once registered
```
Delivery zones already carry `price`; a zone with `price = null` returns no
rate (delivery available for pickup only) and `0` returns a free rate.

### Registration `app/services/carrier/setupCarrierService.server.ts`

Port of nuflorist's setup: query `carrierServices(first: 100)`, find ours by
name `Quali8 Delivery`, compare `callbackUrl`, create or update via
`carrierServiceCreate` / `carrierServiceUpdate` with
`{ name, active: true, callbackUrl: <app origin>/api/carrier/rates,
supportsServiceDiscovery: true }`, store the GID on `ShopifyStore`. Runs
from the Carrier page loader (not on install) so stores without the feature
are not spammed; result feeds `gatekeep` criteria
`shopifyPlanSupportsCarrierServices` → `SF002`.

Uses the raw Admin client already used for discounts (`createAdminApiClient`
pinned to `2026-04`) or the default client — `carrierServiceCreate` exists on
January25, so the default client is fine.

### Rates endpoint `app/routes/api.carrier.rates/route.tsx` (POST)

- Verify `X-Shopify-Hmac-Sha256` over the raw body with the app secret (port
  `validateHmac`); 401 otherwise. Read `X-Shopify-Shop-Domain`.
- Parse `rate.destination.postal_code`, `rate.currency`, `rate.items` (zod).
- Load the shop's `CarrierRate` (enabled) and active `DeliveryZone`s; match
  with `matchZone`. Respond `{ rates: [{ service_name: title, service_code:
  "quali8-delivery", total_price: cents, currency, description: zone.message,
  min/max_delivery_date: today }] }`; no zone and no fallback → `{ rates: [] }`
  (Shopify then shows "no shipping available", which is the gate at checkout
  even if someone bypasses the cart block).
- Respond within Shopify's 10-second budget; DB only, no Admin API calls.

### Admin page `app/routes/app.carrier._index` ("Delivery Rates", feature 10)

Registry entry: category Sales & Pricing, key `delivery-rates`, plan Advance,
gate `{ hasShippingDiscounts: true }` plus the carrier check. Page: status
card (registered / not supported on this Shopify plan / scope missing), the
rate title, enable switch, fallback price, and a link to the zones on the
Announcements + Delivery Check page. Zones stay in one place.

Billing: the user said the feature is "only available for yearly plans". Two
readings; pick one at implementation time:
- Shopify's requirement (annual Shopify plan) → handled by `SF002` above.
- Quali8's own Advance-annual plan → add a `hasCarrierService` flag on
  `RecurringPlan`, seed it true only on an `advance-annual` plan, gate with
  `{ hasCarrierService: true }` (code `AP008`, as nuflorist does).

## Order of work

1. Part A block + admin section (no schema changes). Ship and test on the dev
   store, including the first-visit prefill behaviour.
2. Owner adds `write_shipping`, redeploys, re-authorizes the dev store.
3. Part B schema + migration (offline SQL as usual), registration service,
   rates endpoint with HMAC + zod tests, admin page, registry entry, docs.
4. Verify end to end on the dev store: zone price appears as the shipping
   rate at checkout; unmatched zip shows no rates.

## Out of scope for v1

- Date/time-based rush upcharges, multi-store origins, pickup locations
  (nuflorist has these; not needed yet).
- Country-scoped zones and non-US province lists beyond US/CA.
- Prefilling phone (no documented checkout param).
