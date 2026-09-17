# Alcohol compliance rules — design

Date: 2026-09-16
Status: approved for planning

## Goal

Let a merchant who sells alcohol alongside other products enforce three legal
rules on the storefront and at checkout, switched on and off from the Delivery
page:

1. **Age check** — the shopper enters a date of birth and confirms they are of
   legal age. The minimum age is a merchant setting (default 21).
2. **Local delivery only** — carts containing alcohol can only be *delivered* to
   a zip code inside the shop's delivery zones ("out of state" is defined as
   "not in any zone"). Pickup is always allowed.
3. **Not sold alone** — a cart containing alcohol must also contain at least one
   product that is not alcohol.

"Alcohol" means any product in one or more collections the merchant picks.

Two enforcement layers share one configuration:

- the **cart widget** (`delivery-checkout` theme block) guides the shopper and
  keeps the theme's checkout buttons hidden while a rule fails;
- a new **Cart & Checkout Validation function** blocks checkout server-side, so
  Buy Now, Shop Pay buttons, and direct `/checkout` links cannot bypass the rules.

The feature is part of Delivery Zones & Rates (feature 10) and is Advance-only
(`hasShippingDiscounts`), like the calendar and the other cart-block settings.

## Out of scope

- Third-party identity verification.
- Product-page or collection-page enforcement (cart and checkout only).
- Per-state or per-country legal tables; the merchant sets one minimum age.
- Any change to the Free plan.
- Editing `shopify.app.toml` (see *Scope* below).

## Data

New Prisma model, one row per shop, cascade-deleted with the store:

```prisma
model AlcoholRules {
  id                Int          @id @default(autoincrement())
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @default(now()) @updatedAt
  //
  enabled           Boolean      @default(false) /// Master switch
  collections       Json         @default("[]") /// [{ id: "gid://shopify/Collection/…", title }]
  ageCheckEnabled   Boolean      @default(true)
  minimumAge        Int          @default(21)
  localOnlyEnabled  Boolean      @default(true)
  notAloneEnabled   Boolean      @default(true)
  ageMessage        String       @default("…")
  localOnlyMessage  String       @default("…")
  notAloneMessage   String       @default("…")
  /// GID of the Shopify validation once created (null until the first save)
  validationId      String?
  //
  shop              String       @unique
  shopifyStore      ShopifyStore @relation(fields: [shop], references: [shop], onDelete: Cascade, onUpdate: Cascade)
}
```

Default messages:

| Field | Default |
|-------|---------|
| `ageMessage` | "You must be {age} or older to purchase alcohol. Please enter your date of birth and confirm." |
| `localOnlyMessage` | "Alcohol can only be delivered locally. We can't deliver alcohol to {zip}." |
| `notAloneMessage` | "Alcohol can't be purchased on its own. Please add another item to your order." |

`{age}` and `{zip}` are substituted by the widget; the function substitutes
`{age}` from the config and drops `{zip}` (checkout attaches the error to the
zip field, so the code is already visible).

Limits: up to 20 collections, `minimumAge` 16–25, messages up to 200 characters.
All enforced by the pure sanitizer (below) and the Zod action schema.

## Pure rule evaluation (shared shape)

`app/services/delivery/alcoholRules.ts` (Vitest) exports:

- `AlcoholRules` type, `defaultAlcoholRules()`, `sanitizeAlcoholRules(input)` —
  same pattern as `cartOptions.ts`.
- `StorefrontAlcoholRules` — what the storefront and the function see:
  `{ enabled, minimumAge, ageCheck, localOnly, notAlone, messages }` plus, for
  the function only, `collectionIds: string[]` and `zips: string[]`.
- `isOfAge(dob: "YYYY-MM-DD", today: "YYYY-MM-DD", minimumAge): boolean` — used by
  the widget (copied into `delivery-checkout.js`, tested here) and by admin
  previews. Handles the birthday-today case and leap-day births.
- `evaluateAlcoholCart(summary)` → `Problem[]`, where
  `summary = { rules, alcoholLineCount, otherLineCount, method: "delivery" | "pickup" | null, zipDeliverable: boolean | null, dob: string | null, confirmed: boolean }`
  and `Problem = { rule: "age" | "localOnly" | "notAlone"; message: string }`.
  No rule fires when `alcoholLineCount === 0` or `rules.enabled` is false.

The function reimplements `evaluateAlcoholCart` and the zip prefix matcher in
its own package (extensions cannot import from `app/`). Both copies run the
same JSON fixture set stored in `extensions/alcohol-validation/fixtures/` so
they cannot drift silently.

## Admin: the Delivery page card

`app/components/Delivery/AlcoholRulesEditor.tsx`, rendered on
`app.delivery._index` after the Cart options card. With `access === "full"` it
is fully editable. With `access === "zones"` (Free, or a downgraded shop) it
renders read-only with an upgrade banner, except the master switch, which stays
live so a downgraded merchant can still switch enforcement off.

Contents, top to bottom:

1. Master switch "Enforce alcohol rules".
2. **Alcohol products**: a "Select collections" button opening the App Bridge
   resource picker (`type: "collection"`, `multiple: true`) plus a list of the
   chosen titles with remove buttons. A warning banner when the master switch is
   on and no collection is selected ("Rules do nothing until you pick at least
   one collection").
3. **Age check**: toggle, minimum age number field, message field.
4. **Local delivery only**: toggle, message field, help text explaining that
   "local" means the zones above and that pickup is always allowed.
5. **Not sold alone**: toggle, message field.
6. **Checkout enforcement** status: a badge with the same states as the
   delivery method filter card — *Active*, *Turned off* (master switch off),
   *Not deployed* (function missing from the installed app version),
   *Permission missing* (`write_validations` not granted), *Error* (raw
   message) — and a **Retry** button that re-runs the sync.
7. Save button. Save writes the row **and** runs the sync (below), then toasts
   "Alcohol rules saved" or shows the sync failure inline; the row is saved even
   when the sync fails so the widget layer still works.

Loader additions (`DeliveryPageData`): `alcohol: AlcoholRules` and
`alcoholValidation: AlcoholValidationStatus` (read-only detection on load,
like `detectDeliveryMethodFilter`).

Action additions: `save-alcohol-rules` (full payload, Zod-validated) and
`retry-alcohol-sync`, both gated on `hasShippingDiscounts`, plus
`disable-alcohol-rules` (sets `enabled = false` and syncs), gated on
`hasDeliveryZones` so it works on every plan.

## Sync to Shopify

`app/services/delivery/alcoholValidation.server.ts`:

- `detectAlcoholValidation(graphql, db, shop)` → status (above). Finds our
  function by handle `alcohol-validation` among `shopifyFunctions` with
  `app.handle === APP_HANDLE`; reads the validation by the stored
  `validationId` (falls back to listing `validations` filtered by
  `functionId` when the id is missing, then persists it).
- `syncAlcoholValidation(graphql, db, shop)`:
  1. Loads the rules and, when `localOnlyEnabled`, the active zones' zip lists.
  2. Builds `AlcoholValidationConfig` (`alcoholValidationConfig.ts`, pure,
     tested): `{ collectionIds, minimumAge, ageCheck, localOnly, notAlone, zips, messages }`.
     `collectionIds` is a top-level array because the function binds it as an
     input-query variable.
  3. No validation yet → `validationCreate` with `{ functionId, enable: rules.enabled, blockOnFailure: true, metafields: [{ namespace: "$app", key: "alcohol-rules", type: "json", value }] }`; store the id.
     Existing → `validationUpdate` with `enable` and the metafield.
  4. Returns the resulting status.
- Triggers: every `save-alcohol-rules`, `retry-alcohol-sync`, and every zone
  mutation in `runDeliveryAction` **when** the rules row exists with
  `localOnlyEnabled && enabled` (zones change the zip list). Zone mutations
  never fail because of the sync; a sync error is logged and surfaced by the
  card's status badge on the next load.

GraphQL documents live in `app/models/shopify.server/graphql/validation.ts`
(`shopifyFunctions`, `validations`, `validationCreate`, `validationUpdate`);
run `npm run graphql-codegen` after adding them.

Config metafield size: zone zip lists are stored normalised (uppercase, no
spaces, `*` prefixes), which keeps a few thousand codes well under the json
metafield limit. If a shop ever exceeds it the mutation's user error is shown
in the status badge; no silent truncation.

### Scope

The Admin mutations require the **`write_validations`** access scope. Per the
project rule, agents never edit `shopify.app.toml`; the developer adds
`write_validations` to `scopes` by hand and deploys. The app's existing
`app/scopes_update` webhook and the *Permission missing* status cover the
period before the merchant re-authorises.

## The validation function

New extension `extensions/alcohol-validation` (TypeScript, api_version
`2026-04`, generated with
`shopify app generate extension --template cart_checkout_validation --flavor typescript --name alcohol-validation`),
laid out like `extensions/delivery-method-filter`: `src/cart_validations_generate_run.{graphql,ts,test.ts}`,
`vitest`, `[extensions.ui.paths]` pointing at `/app/delivery`.

`shopify.extension.toml` binds the input variables to the validation's
metafield:

```toml
[extensions.input.variables]
namespace = "$app"
key = "alcohol-rules"
```

Input query (names are illustrative; exact fields verified against
`schema.graphql` during implementation):

```graphql
query CartValidationsGenerateRunInput($collectionIds: [ID!]! = []) {
  buyerJourney { step }
  validation { metafield(namespace: "$app", key: "alcohol-rules") { jsonValue } }
  cart {
    deliveryMethod: attribute(key: "Delivery method") { value }
    dob: attribute(key: "Date of birth") { value }
    ageConfirmed: attribute(key: "Age confirmed") { value }
    lines {
      quantity
      merchandise {
        __typename
        ... on ProductVariant { product { isAlcohol: inAnyCollection(ids: $collectionIds) } }
      }
    }
    deliveryGroups {
      deliveryAddress { zip }
      selectedDeliveryOption { deliveryMethodType }
    }
  }
}
```

Logic (`cartValidationsGenerateRun`):

- No metafield, `collectionIds` empty, or no alcohol line → no operations.
- `buyerJourney.step === CART_INTERACTION` → no operations. Errors are only
  produced from checkout interaction and completion onward, so shoppers can
  still build the cart and the widget can guide them.
- Method: the `Delivery method` attribute wins ("Pickup" / "Delivery"); with no
  attribute, a selected delivery option of type `PICK_UP` means pickup, anything
  else means delivery.
- **notAlone**: alcohol lines > 0 and other lines = 0 → error on `$.cart`.
- **localOnly** (delivery only): no zip, or zip matches no entry in `zips`
  (exact or `*` prefix, normalised the same way as `deliveryZones.ts`) → error
  on `$.cart.deliveryGroups[0].deliveryAddress.zip`.
- **ageCheck**: `Age confirmed` not "Yes", or `Date of birth` missing or not
  `YYYY-MM-DD` → error on `$.cart`.
- Output: one `validationAdd` operation with the collected errors.

Tests: one case per rule on/off, each buyer-journey step, pickup vs delivery,
prefix zips, missing attributes, plus the shared fixture set.

### Known limit

Functions have no clock, so the function cannot compute age from the date of
birth. It enforces presence and format; the widget makes the underage decision
and refuses to write `Age confirmed` when the date fails `isOfAge`. A shopper
who forges cart attributes through the cart API can pass the check, as with any
cart-level control. The order carries the claimed date of birth as evidence.

## Storefront

### Proxies

- `proxy.delivery-schedule` payload gains `alcohol: StorefrontAlcoholRules`
  (without `collectionIds`/`zips`). Free plans get `{ enabled: false }` with the
  rest of the empty schedule.
- New `proxy.alcohol-check` (`/apps/quali8/alcohol-check?products=<id,id,…>`,
  up to 100 ids): returns `{ enabled, restricted: ["<productId>", …] }`.
  Resolution in `app/services/delivery/alcoholProducts.server.ts` via the
  proxy's offline Admin client: `nodes(ids)` with one aliased
  `inCollection(id:)` per configured collection, OR-ed per product (the pure
  reducer is tested). `Cache-Control: public, max-age=120`. Returns
  `{ enabled: false, restricted: [] }` when rules are off, the plan lacks
  `hasShippingDiscounts`, no collections are configured, or on error.

### Cart block (`delivery-checkout.js`)

- Reads `schedule.alcohol`; when `enabled`, calls `alcohol-check` with the
  cart's product ids on load and after every `reloadCart()`; keeps
  `state.alcohol = { restrictedIds: [], hasOther: false, checked: false }`.
  Until the first answer arrives the block behaves as if there is no alcohol.
- Derives `alcoholInCart = restrictedIds.length > 0`.
- **Not sold alone**: when it fires, a notice card (`q8-dc__alcohol-notice`)
  renders above the steps with the message and a "Keep shopping" link;
  `summaryValid()` returns false, so the Checkout button and the theme's buttons
  stay blocked.
- **Local delivery only**: when `alcoholInCart && rules.localOnly`, the zip
  step on the Delivery path is shown even when the merchant's zip checker switch
  is off (`checkerOn || alcoholLocalOnly`), and a non-deliverable zip shows
  `localOnlyMessage` instead of the default fail text. Pickup is unchanged.
- **Age check**: when `alcoholInCart && rules.ageCheck`, the Sender step gets
  an "Age verification" card below the recipient fields: a date-of-birth input
  (`type="date"`, `max` = today) and a checkbox "I confirm that I and the
  recipient are {age} or older and that an adult with valid ID will receive the
  order." `senderValid()` also requires a date that passes `isOfAge` and the
  box ticked; an underage date shows `ageMessage` inline and the box is
  disabled. On change the block writes cart attributes `Date of birth`
  (`YYYY-MM-DD`) and `Age confirmed` (`Yes`); when the card is hidden or the
  date fails, both are written as empty strings so stale values never linger.
  Values persist across reloads through the existing attribute restore.
- Step rendering: whenever `state.alcohol` changes, the current step re-renders
  and `setBlocked` re-evaluates.
- All copy comes from the proxy payload with the defaults duplicated in the JS
  (the block is at the 75-setting cap; no new theme settings).

### Order data

Orders carry note attributes `Date of birth`, `Age confirmed`, and the existing
`Delivery method` / zone attributes, which is what the merchant shows if asked
to prove the check happened.

## Error handling

- Proxy failures fall back to "no alcohol" on the storefront (never block the
  shopper for an outage); the validation function remains the hard gate.
- Sync failures never block saving rules or editing zones; they show in the
  status badge with the raw message.
- Plan downgrade: the proxies stop returning rules, so the widget layer goes
  quiet, but the Shopify validation stays as last synced. For a compliance
  feature this fail-closed behaviour is intended. The merchant can still turn
  enforcement off with the master switch (`disable-alcohol-rules`), which is
  the one control that stays live on the Free plan.

## Testing

- Vitest: `alcoholRules.test.ts` (sanitizer, `isOfAge`, `evaluateAlcoholCart`),
  `alcoholValidationConfig.test.ts`, the proxy's membership reducer, and the
  function's suite; the shared fixture set runs in both packages.
- Manual, dev store: pick a collection; verify each toggle in the cart block;
  verify checkout blocks via a direct `/checkout` link with (a) alcohol only,
  (b) out-of-zone zip, (c) no age attributes; verify pickup passes localOnly;
  verify master switch off disables the validation in Settings → Checkout.

## Files touched (summary)

- `prisma/schema.prisma` + migration `alcohol_rules`
- `app/services/delivery/alcoholRules.ts` (+ test), `alcoholRules.server.ts`,
  `alcoholValidation.server.ts`, `alcoholValidationConfig.ts` (+ test),
  `alcoholProducts.server.ts` (+ reducer test)
- `app/models/shopify.server/graphql/validation.ts` (+ codegen)
- `app/components/Delivery/AlcoholRulesEditor.tsx`, `types.ts`
- `app/routes/app.delivery._index/{loader,action,route}`
- `app/routes/proxy.delivery-schedule/route.tsx`, new `app/routes/proxy.alcohol-check/route.tsx`
- `app/services/delivery/deliverySchedule.server.ts` (payload), `deliveryZones.server.ts` (sync trigger)
- `extensions/alcohol-validation/*` (new function)
- `extensions/theme-quali8/assets/delivery-checkout.js`, `delivery-checkout.css`
- `CLAUDE.md` (Delivery section: the new card, proxy, function, and the manual `write_validations` step)
