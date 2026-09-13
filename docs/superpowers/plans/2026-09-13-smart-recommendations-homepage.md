# Smart Recommendations on the Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Smart Recommendations out of the delivery-checkout cart block into its own home-page theme block, fed by cart, recently-viewed and returning-visitor signals recorded by a tiny tracker app embed.

**Architecture:** A pure rules layer (`smartRules.ts`, `smartRails.ts`, `shopperParams.ts`) evaluates the merchant's ordered rules against "shopper facts" and assembles up to three non-overlapping rails; the server module resolves rule sources through the Admin API and the app proxy returns one rail per `slot`. On the storefront, a `smart-tracker` app embed writes viewed products to localStorage on product pages, and the `smart-recommendations` section block (home template only) reads the cart and that storage, asks the proxy, optionally fetches Shopify's public related-products endpoint, and renders a rail with quick add-to-cart.

**Tech Stack:** React Router 7 + Polaris 12 (admin), Prisma 6 + PostgreSQL (rules), Shopify theme app extension (Liquid + vanilla JS/CSS), Vitest for the pure modules.

**Spec:** `docs/superpowers/specs/2026-09-13-smart-recommendations-homepage-design.md`

---

## Read this before starting

- **The local `.env` `DATABASE_URL` points at the production database** (see memory `env-points-at-production-db`). Never run `prisma migrate dev` or `prisma migrate reset` in this repo. The migration in Task 1 is written by hand and applied with `prisma migrate deploy` (which `npm run dev` also runs). The migration only adds enum values, which is additive and safe for existing rows, but be aware it applies to production the first time any migrate deploy runs.
- **Never touch `shopify.app.toml` or any `shopify.app.toml.*` variant.** Stage files explicitly (`git add <paths>`), never `git add -A`.
- Imports use the `app/...` alias. Server-only files end in `.server.ts`.
- Tests: `npx vitest run <path>` from the repo root. Lint: `npm run lint`. Typecheck: `npx tsc --noEmit` (slow, run once before the final commit).
- Theme extension conventions (copy from `extensions/theme-quali8/assets/occasion-gifts.js`): all DOM built with `createElement`/`textContent`, never `innerHTML` with remote data; every localStorage access wrapped in try/catch; blocks stay `hidden` until they have content.
- Shopify caps: a theme app block may declare at most 6 non-interactive settings (`header`/`paragraph`) and app embed names must be 25 characters or fewer.
- Commit messages end with:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014SbBKDAQgKNPwtJ7YnJrE3
```

## File map

| File | Responsibility |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20260913230000_recommendation_shopper_signals/migration.sql` | Three new trigger enum values, two new source enum values |
| `app/services/recommendations/smartRules.ts` (+ test) | Pure: `ShopperFacts`, `ruleMatches`, `ruleUsable`, `pickRules`, `pickRule` |
| `app/services/recommendations/smartRails.ts` (+ test) | Pure: `assembleRails` — filter each rule's pool, dedupe across rails |
| `app/services/recommendations/shopperParams.ts` (+ test) | Pure: parse the proxy query string into typed signals |
| `app/services/recommendations/themeEditorLinks.ts` (+ test) | Pure: deep links to add the block / enable the embed |
| `app/services/recommendations/smartRecommendations.server.ts` | `recommendForShopper`: load rules, resolve sources, return the requested slot |
| `app/routes/proxy.smart-recommendations/route.tsx` | App proxy endpoint |
| `app/routes/app.recommendations.$id/{route.tsx,action/index.ts,loader/index.ts}` | Rule editor: new triggers and sources |
| `app/routes/app.recommendations._index/{route.tsx,loader/index.ts}` | Rule list: descriptions, setup card, home-page copy |
| `extensions/theme-quali8/blocks/smart-tracker.liquid`, `assets/smart-tracker.js` | App embed that records viewed products |
| `extensions/theme-quali8/blocks/smart-recommendations.liquid`, `assets/smart-recommendations.{js,css}` | Home page block |
| `extensions/theme-quali8/blocks/delivery-checkout.liquid`, `assets/delivery-checkout.js` | Remove the smart rail from the Options step |
| `app/components/OneApp/features.ts`, `CLAUDE.md` | Copy |

---

### Task 1: Schema — new triggers and sources

**Files:**
- Modify: `prisma/schema.prisma` (enums `RecommendationTrigger`, `RecommendationSource`, around lines 689–701)
- Create: `prisma/migrations/20260913230000_recommendation_shopper_signals/migration.sql`

- [ ] **Step 1: Extend the enums in `prisma/schema.prisma`**

Replace the two enum blocks with:

```prisma
enum RecommendationTrigger {
  ALWAYS
  CART_HAS_COLLECTION
  CART_HAS_PRODUCT
  CART_TOTAL_MIN
  /// Shopper viewed a product from triggerCollectionId (tracker embed)
  VIEWED_COLLECTION
  /// Shopper viewed triggerProductId (tracker embed)
  VIEWED_PRODUCT
  /// Shopper's first visit was before today (tracker embed)
  RETURNING_VISITOR
}

enum RecommendationSource {
  COLLECTION
  TAG
  NEWEST
  PRODUCTS
  /// The products the shopper viewed, newest first
  RECENTLY_VIEWED
  /// Shopify's related products for the most recently viewed product (resolved in the storefront block)
  RELATED_TO_VIEWED
}
```

- [ ] **Step 2: Write the migration by hand**

Create `prisma/migrations/20260913230000_recommendation_shopper_signals/migration.sql`:

```sql
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "RecommendationTrigger" ADD VALUE 'VIEWED_COLLECTION';
ALTER TYPE "RecommendationTrigger" ADD VALUE 'VIEWED_PRODUCT';
ALTER TYPE "RecommendationTrigger" ADD VALUE 'RETURNING_VISITOR';

-- AlterEnum
ALTER TYPE "RecommendationSource" ADD VALUE 'RECENTLY_VIEWED';
ALTER TYPE "RecommendationSource" ADD VALUE 'RELATED_TO_VIEWED';
```

- [ ] **Step 3: Regenerate the Prisma client (no database access)**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client`. Do **not** run `prisma migrate dev`.

- [ ] **Step 4: Confirm the schema and migration agree**

Run: `npx prisma validate` (do not use `prisma migrate diff`, which needs a shadow database and would run against production)
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260913230000_recommendation_shopper_signals/migration.sql
git commit -m "Recommendations: viewed-product, viewed-collection and returning-visitor triggers; recently-viewed and related sources"
```

---

### Task 2: Pure rules — shopper facts, new triggers, `pickRules`

**Files:**
- Modify: `app/services/recommendations/smartRules.ts`
- Modify: `app/services/recommendations/smartRules.test.ts`

- [ ] **Step 1: Rewrite the test file for the new API**

Replace `app/services/recommendations/smartRules.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  needsCollections,
  pickRule,
  pickRules,
  ruleMatches,
  ruleUsable,
  withinPrice,
  type RuleLike,
  type ShopperFacts,
} from "./smartRules";

const rule = (overrides: Partial<RuleLike> = {}): RuleLike => ({
  position: 0,
  trigger: "ALWAYS",
  triggerCollectionId: null,
  triggerProductId: null,
  triggerMinTotal: null,
  source: "NEWEST",
  ...overrides,
});

const facts = (overrides: Partial<ShopperFacts> = {}): ShopperFacts => ({
  productIds: [],
  collectionIds: [],
  total: null,
  viewedProductIds: [],
  viewedCollectionIds: [],
  returning: false,
  ...overrides,
});

describe("ruleMatches", () => {
  it("ALWAYS matches any shopper", () => {
    expect(ruleMatches(rule(), facts())).toBe(true);
  });

  it("CART_HAS_COLLECTION needs the collection in the cart", () => {
    const r = rule({
      trigger: "CART_HAS_COLLECTION",
      triggerCollectionId: "gid://shopify/Collection/1",
    });
    expect(ruleMatches(r, facts({ collectionIds: ["gid://shopify/Collection/1"] }))).toBe(true);
    expect(ruleMatches(r, facts({ collectionIds: ["gid://shopify/Collection/2"] }))).toBe(false);
    expect(ruleMatches(rule({ trigger: "CART_HAS_COLLECTION" }), facts())).toBe(false);
  });

  it("CART_HAS_PRODUCT needs the product in the cart", () => {
    const r = rule({
      trigger: "CART_HAS_PRODUCT",
      triggerProductId: "gid://shopify/Product/9",
    });
    expect(ruleMatches(r, facts({ productIds: ["gid://shopify/Product/9"] }))).toBe(true);
    expect(ruleMatches(r, facts({ productIds: ["gid://shopify/Product/8"] }))).toBe(false);
  });

  it("CART_TOTAL_MIN compares the subtotal and ignores unknown totals", () => {
    const r = rule({ trigger: "CART_TOTAL_MIN", triggerMinTotal: 50 });
    expect(ruleMatches(r, facts({ total: 50 }))).toBe(true);
    expect(ruleMatches(r, facts({ total: 49.99 }))).toBe(false);
    expect(ruleMatches(r, facts({ total: null }))).toBe(false);
  });

  it("VIEWED_COLLECTION needs a viewed product from the collection", () => {
    const r = rule({
      trigger: "VIEWED_COLLECTION",
      triggerCollectionId: "gid://shopify/Collection/5",
    });
    expect(ruleMatches(r, facts({ viewedCollectionIds: ["gid://shopify/Collection/5"] }))).toBe(true);
    expect(ruleMatches(r, facts({ collectionIds: ["gid://shopify/Collection/5"] }))).toBe(false);
    expect(ruleMatches(rule({ trigger: "VIEWED_COLLECTION" }), facts())).toBe(false);
  });

  it("VIEWED_PRODUCT needs the product in the viewed list", () => {
    const r = rule({
      trigger: "VIEWED_PRODUCT",
      triggerProductId: "gid://shopify/Product/3",
    });
    expect(ruleMatches(r, facts({ viewedProductIds: ["gid://shopify/Product/3"] }))).toBe(true);
    expect(ruleMatches(r, facts({ productIds: ["gid://shopify/Product/3"] }))).toBe(false);
    expect(ruleMatches(rule({ trigger: "VIEWED_PRODUCT" }), facts())).toBe(false);
  });

  it("RETURNING_VISITOR reads the returning flag", () => {
    const r = rule({ trigger: "RETURNING_VISITOR" });
    expect(ruleMatches(r, facts({ returning: true }))).toBe(true);
    expect(ruleMatches(r, facts({ returning: false }))).toBe(false);
  });
});

describe("ruleUsable", () => {
  it("viewed-based sources need at least one viewed product", () => {
    expect(ruleUsable(rule({ source: "RECENTLY_VIEWED" }), facts())).toBe(false);
    expect(ruleUsable(rule({ source: "RELATED_TO_VIEWED" }), facts())).toBe(false);
    const viewed = facts({ viewedProductIds: ["gid://shopify/Product/1"] });
    expect(ruleUsable(rule({ source: "RECENTLY_VIEWED" }), viewed)).toBe(true);
    expect(ruleUsable(rule({ source: "RELATED_TO_VIEWED" }), viewed)).toBe(true);
  });

  it("other sources only need the trigger to match", () => {
    expect(ruleUsable(rule({ source: "NEWEST" }), facts())).toBe(true);
    expect(ruleUsable(rule({ trigger: "RETURNING_VISITOR", source: "NEWEST" }), facts())).toBe(false);
  });
});

describe("pickRules", () => {
  const rules = [
    { ...rule({ position: 2 }), name: "fallback" },
    {
      ...rule({ position: 1, trigger: "CART_TOTAL_MIN", triggerMinTotal: 100 }),
      name: "big carts",
    },
    { ...rule({ position: 0, source: "RECENTLY_VIEWED" }), name: "viewed" },
  ];

  it("returns every usable rule in position order", () => {
    const picked = pickRules(rules, facts({ total: 150, viewedProductIds: ["gid://shopify/Product/1"] }));
    expect(picked.map((r) => r.name)).toEqual(["viewed", "big carts", "fallback"]);
  });

  it("skips rules that don't match or can't be used", () => {
    const picked = pickRules(rules, facts({ total: 20 }));
    expect(picked.map((r) => r.name)).toEqual(["fallback"]);
  });

  it("pickRule is the first usable rule or null", () => {
    expect(pickRule(rules, facts({ total: 150 }))?.name).toBe("big carts");
    expect(pickRule([rule({ trigger: "CART_TOTAL_MIN", triggerMinTotal: 100 })], facts({ total: 10 }))).toBeNull();
  });
});

describe("helpers", () => {
  it("needsCollections only for cart collection triggers", () => {
    expect(needsCollections([rule()])).toBe(false);
    expect(needsCollections([rule({ trigger: "VIEWED_COLLECTION" })])).toBe(false);
    expect(needsCollections([rule(), rule({ trigger: "CART_HAS_COLLECTION" })])).toBe(true);
  });

  it("withinPrice treats null bounds as open", () => {
    expect(withinPrice(30, null, null)).toBe(true);
    expect(withinPrice(30, 40, null)).toBe(false);
    expect(withinPrice(30, null, 20)).toBe(false);
    expect(withinPrice(30, 20, 40)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/services/recommendations/smartRules.test.ts`
Expected: FAIL — `pickRules` and `ruleUsable` are not exported; TypeScript errors on `source` and `viewedProductIds`.

- [ ] **Step 3: Rewrite `app/services/recommendations/smartRules.ts`**

```ts
/**
 * Pure rule evaluation for Smart Recommendations (the home page block). No
 * server imports — fully unit tested. The server module loads the shop's
 * rules and the shopper's facts (cart, viewed products, returning flag),
 * then this picks the rules that apply, in position order.
 */

export type RuleTrigger =
  | "ALWAYS"
  | "CART_HAS_COLLECTION"
  | "CART_HAS_PRODUCT"
  | "CART_TOTAL_MIN"
  | "VIEWED_COLLECTION"
  | "VIEWED_PRODUCT"
  | "RETURNING_VISITOR";

export type RuleSource =
  | "COLLECTION"
  | "TAG"
  | "NEWEST"
  | "PRODUCTS"
  | "RECENTLY_VIEWED"
  | "RELATED_TO_VIEWED";

export type RuleLike = {
  position: number;
  trigger: RuleTrigger;
  triggerCollectionId: string | null;
  triggerProductId: string | null;
  triggerMinTotal: number | null;
  source: RuleSource;
};

export type ShopperFacts = {
  /** Product GIDs in the cart. */
  productIds: string[];
  /** Collection GIDs any cart product belongs to (may be unknown = []). */
  collectionIds: string[];
  /** Cart subtotal in the shop currency, or null when not sent. */
  total: number | null;
  /** Product GIDs the shopper viewed, newest first (from the tracker embed). */
  viewedProductIds: string[];
  /** Collection GIDs of the viewed products. */
  viewedCollectionIds: string[];
  /** First seen before today. */
  returning: boolean;
};

export function ruleMatches(rule: RuleLike, facts: ShopperFacts): boolean {
  switch (rule.trigger) {
    case "ALWAYS":
      return true;
    case "CART_HAS_COLLECTION":
      return (
        rule.triggerCollectionId !== null &&
        facts.collectionIds.includes(rule.triggerCollectionId)
      );
    case "CART_HAS_PRODUCT":
      return (
        rule.triggerProductId !== null &&
        facts.productIds.includes(rule.triggerProductId)
      );
    case "CART_TOTAL_MIN":
      return (
        rule.triggerMinTotal !== null &&
        facts.total !== null &&
        facts.total >= rule.triggerMinTotal
      );
    case "VIEWED_COLLECTION":
      return (
        rule.triggerCollectionId !== null &&
        facts.viewedCollectionIds.includes(rule.triggerCollectionId)
      );
    case "VIEWED_PRODUCT":
      return (
        rule.triggerProductId !== null &&
        facts.viewedProductIds.includes(rule.triggerProductId)
      );
    case "RETURNING_VISITOR":
      return facts.returning;
  }
}

/** True when the rule matches and its source can produce anything for this shopper. */
export function ruleUsable(rule: RuleLike, facts: ShopperFacts): boolean {
  if (!ruleMatches(rule, facts)) return false;
  if (rule.source === "RECENTLY_VIEWED" || rule.source === "RELATED_TO_VIEWED") {
    return facts.viewedProductIds.length > 0;
  }
  return true;
}

/** Every usable rule, by position. Index 0 is rail 1, index 1 is rail 2, … */
export function pickRules<T extends RuleLike>(rules: T[], facts: ShopperFacts): T[] {
  return [...rules]
    .sort((a, b) => a.position - b.position)
    .filter((rule) => ruleUsable(rule, facts));
}

/** The first usable rule, or null. */
export function pickRule<T extends RuleLike>(rules: T[], facts: ShopperFacts): T | null {
  return pickRules(rules, facts)[0] ?? null;
}

/** True when evaluating these rules needs the cart's collection ids (Admin API lookup). */
export function needsCollections(rules: RuleLike[]): boolean {
  return rules.some((rule) => rule.trigger === "CART_HAS_COLLECTION");
}

export function withinPrice(
  price: number,
  min: number | null,
  max: number | null,
): boolean {
  if (min !== null && price < min) return false;
  if (max !== null && price > max) return false;
  return true;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/services/recommendations/smartRules.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add app/services/recommendations/smartRules.ts app/services/recommendations/smartRules.test.ts
git commit -m "Recommendations: rules evaluate shopper facts and return every match in order"
```

Note: `smartRecommendations.server.ts` still imports `CartFacts` and will fail typecheck until Task 5. That is expected; do not run `tsc` between Tasks 2 and 5.

---

### Task 3: Pure rails — `assembleRails`

**Files:**
- Create: `app/services/recommendations/smartRails.ts`
- Create: `app/services/recommendations/smartRails.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/services/recommendations/smartRails.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assembleRails, type RailRule } from "./smartRails";

const p = (id: string, price = 10) => ({ productId: `gid://shopify/Product/${id}`, price });

const railRule = (id: number, overrides: Partial<RailRule> = {}): RailRule => ({
  id,
  limit: 4,
  minPrice: null,
  maxPrice: null,
  excludeCartItems: true,
  ...overrides,
});

describe("assembleRails", () => {
  it("returns one rail per rule, in order, capped by the rule limit and the cap", () => {
    const pools = new Map([[1, [p("a"), p("b"), p("c")]]]);
    expect(assembleRails([railRule(1, { limit: 2 })], pools, new Set(), 12)).toEqual([
      [p("a"), p("b")],
    ]);
    expect(assembleRails([railRule(1, { limit: 12 })], pools, new Set(), 2)).toEqual([
      [p("a"), p("b")],
    ]);
  });

  it("drops cart items when the rule excludes them, keeps them otherwise", () => {
    const pools = new Map([[1, [p("a"), p("b")]]]);
    const inCart = new Set(["gid://shopify/Product/a"]);
    expect(assembleRails([railRule(1)], pools, inCart, 12)).toEqual([[p("b")]]);
    expect(assembleRails([railRule(1, { excludeCartItems: false })], pools, inCart, 12)).toEqual([
      [p("a"), p("b")],
    ]);
  });

  it("applies the rule's price range", () => {
    const pools = new Map([[1, [p("a", 5), p("b", 25), p("c", 50)]]]);
    expect(assembleRails([railRule(1, { minPrice: 10, maxPrice: 30 })], pools, new Set(), 12)).toEqual([
      [p("b", 25)],
    ]);
  });

  it("never repeats a product in a later rail and dedupes inside a rail", () => {
    const pools = new Map([
      [1, [p("a"), p("b"), p("a")]],
      [2, [p("b"), p("c")]],
    ]);
    expect(assembleRails([railRule(1), railRule(2)], pools, new Set(), 12)).toEqual([
      [p("a"), p("b")],
      [p("c")],
    ]);
  });

  it("gives an empty rail to a rule with no pool", () => {
    expect(assembleRails([railRule(7)], new Map(), new Set(), 12)).toEqual([[]]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/services/recommendations/smartRails.test.ts`
Expected: FAIL — cannot find module `./smartRails`.

- [ ] **Step 3: Implement `app/services/recommendations/smartRails.ts`**

```ts
/**
 * Pure rail assembly for Smart Recommendations. Given the usable rules (in
 * order) and each rule's candidate pool, produces one rail per rule with
 * the rule's own filters applied and no product repeated across rails, so
 * a merchant who stacks two blocks on the home page never shows the same
 * product twice.
 */
import { withinPrice } from "./smartRules";

export type RailRule = {
  id: number;
  limit: number;
  minPrice: number | null;
  maxPrice: number | null;
  excludeCartItems: boolean;
};

export type RailProduct = {
  productId: string;
  price: number;
};

export function assembleRails<P extends RailProduct>(
  rules: RailRule[],
  pools: Map<number, P[]>,
  inCart: Set<string>,
  cap: number,
): P[][] {
  const used = new Set<string>();
  return rules.map((rule) => {
    const rail: P[] = [];
    const max = Math.max(1, Math.min(cap, rule.limit));
    for (const product of pools.get(rule.id) ?? []) {
      if (used.has(product.productId)) continue;
      if (rule.excludeCartItems && inCart.has(product.productId)) continue;
      if (!withinPrice(product.price, rule.minPrice, rule.maxPrice)) continue;
      used.add(product.productId);
      rail.push(product);
      if (rail.length >= max) break;
    }
    return rail;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/services/recommendations/smartRails.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/services/recommendations/smartRails.ts app/services/recommendations/smartRails.test.ts
git commit -m "Recommendations: assemble stacked rails without repeating products"
```

---

### Task 4: Pure query parsing — `parseShopperParams`

**Files:**
- Create: `app/services/recommendations/shopperParams.ts`
- Create: `app/services/recommendations/shopperParams.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/services/recommendations/shopperParams.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseShopperParams } from "./shopperParams";

const parse = (query: string) => parseShopperParams(new URLSearchParams(query));

describe("parseShopperParams", () => {
  it("has safe defaults for an empty query", () => {
    expect(parse("")).toEqual({
      cartProductIds: [],
      cartTotal: null,
      viewedProductIds: [],
      viewedCollectionIds: [],
      returning: false,
      slot: 1,
      limit: 4,
    });
  });

  it("turns numeric ids into GIDs and drops junk", () => {
    const result = parse("cart=1,x,2&viewed=3,,4&viewedCollections=5,abc");
    expect(result.cartProductIds).toEqual(["gid://shopify/Product/1", "gid://shopify/Product/2"]);
    expect(result.viewedProductIds).toEqual(["gid://shopify/Product/3", "gid://shopify/Product/4"]);
    expect(result.viewedCollectionIds).toEqual(["gid://shopify/Collection/5"]);
  });

  it("caps the viewed lists at 12 products and 24 collections", () => {
    const products = Array.from({ length: 20 }, (_, i) => String(i + 1)).join(",");
    const collections = Array.from({ length: 30 }, (_, i) => String(i + 1)).join(",");
    const result = parse(`viewed=${products}&viewedCollections=${collections}`);
    expect(result.viewedProductIds).toHaveLength(12);
    expect(result.viewedCollectionIds).toHaveLength(24);
  });

  it("parses the total, returning flag, slot and limit with clamping", () => {
    expect(parse("total=12.5&returning=1&slot=2&limit=6")).toMatchObject({
      cartTotal: 12.5,
      returning: true,
      slot: 2,
      limit: 6,
    });
    expect(parse("total=-1&returning=0&slot=9&limit=99")).toMatchObject({
      cartTotal: null,
      returning: false,
      slot: 3,
      limit: 12,
    });
    expect(parse("slot=0&limit=0&total=abc")).toMatchObject({ slot: 1, limit: 1, cartTotal: null });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/services/recommendations/shopperParams.test.ts`
Expected: FAIL — cannot find module `./shopperParams`.

- [ ] **Step 3: Implement `app/services/recommendations/shopperParams.ts`**

```ts
/**
 * Parses the Smart Recommendations proxy query string into typed shopper
 * signals. The home page block sends numeric ids; the app works in GIDs.
 */

export type ShopperParams = {
  cartProductIds: string[];
  cartTotal: number | null;
  viewedProductIds: string[];
  viewedCollectionIds: string[];
  returning: boolean;
  /** Which matching rule this block instance shows: 1, 2 or 3. */
  slot: number;
  /** Hard cap on products from the block: 1–12. */
  limit: number;
};

export const MAX_SLOT = 3;
export const MAX_LIMIT = 12;
const MAX_VIEWED_PRODUCTS = 12;
const MAX_VIEWED_COLLECTIONS = 24;

const gids = (value: string | null, kind: "Product" | "Collection", max: number): string[] =>
  (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))
    .slice(0, max)
    .map((id) => `gid://shopify/${kind}/${id}`);

const clampInt = (value: string | null, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export function parseShopperParams(params: URLSearchParams): ShopperParams {
  const total = Number.parseFloat(params.get("total") ?? "");
  return {
    cartProductIds: gids(params.get("cart"), "Product", 200),
    cartTotal: Number.isFinite(total) && total >= 0 ? total : null,
    viewedProductIds: gids(params.get("viewed"), "Product", MAX_VIEWED_PRODUCTS),
    viewedCollectionIds: gids(params.get("viewedCollections"), "Collection", MAX_VIEWED_COLLECTIONS),
    returning: params.get("returning") === "1",
    slot: clampInt(params.get("slot"), 1, 1, MAX_SLOT),
    limit: clampInt(params.get("limit"), 4, 1, MAX_LIMIT),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/services/recommendations/shopperParams.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/services/recommendations/shopperParams.ts app/services/recommendations/shopperParams.test.ts
git commit -m "Recommendations: parse home page block signals from the proxy query"
```

---

### Task 5: Server — `recommendForShopper` with slots and new sources

**Files:**
- Modify: `app/services/recommendations/smartRecommendations.server.ts`

- [ ] **Step 1: Replace the request/response types and the main function**

Rewrite `app/services/recommendations/smartRecommendations.server.ts` as:

```ts
import type { PrismaClient, RecommendationRule } from "@prisma/client";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  getCollectionProducts,
  getProductCollectionIds,
  getProductsByIds,
  getProductsByQuery,
  getRecentProducts,
  type SellableProduct,
} from "app/models/shopify.server/recommendations";
import { assembleRails } from "./smartRails";
import { needsCollections, pickRules, type ShopperFacts } from "./smartRules";

export type SmartRecommendationRequest = {
  shop: string;
  /** Product GIDs currently in the cart. */
  cartProductIds: string[];
  /** Cart subtotal in the shop currency, or null when the block didn't send it. */
  cartTotal: number | null;
  /** Product GIDs the shopper viewed, newest first. */
  viewedProductIds: string[];
  /** Collection GIDs of the viewed products. */
  viewedCollectionIds: string[];
  /** First seen before today. */
  returning: boolean;
  /** Which matching rule to return: 1, 2 or 3 (one block instance per slot). */
  slot: number;
  /** Hard cap from the storefront block (the rule's own limit still applies). */
  maxProducts?: number;
};

export type SmartRecommendedProduct = {
  productId: string;
  variantId: string | null;
  title: string;
  price: number;
  imageUrl: string | null;
  handle: string | null;
};

/**
 * For RELATED_TO_VIEWED rules the block asks Shopify's public
 * `/recommendations/products.json` itself (the app has no Storefront token)
 * and applies these filters client-side.
 */
export type RelatedRail = {
  /** Numeric product id of the most recently viewed product. */
  seedProductId: string;
  limit: number;
  minPrice: number | null;
  maxPrice: number | null;
  excludeCartItems: boolean;
};

export type SmartRecommendationResponse = {
  products: SmartRecommendedProduct[];
  /** The matched rule's storefront heading, if it set one. */
  heading: string | null;
  ruleId: number | null;
  /** True when no rule exists and the newest products were shown instead. */
  fallbackUsed: boolean;
  related?: RelatedRail;
};

/** Shape stored in RecommendationRule.sourceProducts. */
export type RuleSourceProduct = {
  productId: string;
  title: string;
  imageUrl: string | null;
};

export const EMPTY_RESPONSE: SmartRecommendationResponse = {
  products: [],
  heading: null,
  ruleId: null,
  fallbackUsed: false,
};

const toProduct = (product: SellableProduct): SmartRecommendedProduct => ({
  productId: product.id,
  variantId: product.variantId,
  title: product.title,
  price: product.price,
  imageUrl: product.imageUrl,
  handle: product.handle,
});

const numericId = (gid: string): string => gid.split("/").pop() ?? gid;

/** Live products for a list of ids, in the order given, dropping anything no longer sellable. */
async function liveInOrder(
  graphql: AdminGraphqlClient,
  ids: string[],
): Promise<SellableProduct[]> {
  const live = await getProductsByIds(graphql, ids);
  return ids
    .map((id) => live.get(id))
    .filter((product): product is SellableProduct => Boolean(product));
}

async function sourceProducts(
  graphql: AdminGraphqlClient,
  rule: RecommendationRule,
  facts: ShopperFacts,
): Promise<SellableProduct[]> {
  switch (rule.source) {
    case "COLLECTION":
      return rule.sourceCollectionId
        ? getCollectionProducts(graphql, rule.sourceCollectionId, 40)
        : [];
    case "TAG":
      return rule.sourceTag
        ? getProductsByQuery(
            graphql,
            `tag:'${rule.sourceTag.replace(/'/g, "")}' status:active`,
            40,
          )
        : [];
    case "NEWEST":
      return getRecentProducts(graphql, 40);
    case "PRODUCTS": {
      const picked = (rule.sourceProducts as RuleSourceProduct[] | null) ?? [];
      return liveInOrder(graphql, picked.map((product) => product.productId));
    }
    case "RECENTLY_VIEWED":
      return liveInOrder(graphql, facts.viewedProductIds);
    case "RELATED_TO_VIEWED":
      // Resolved in the storefront block; see RelatedRail.
      return [];
  }
}

/**
 * Smart Recommendations for the home page block: evaluates the shop's rules
 * against the shopper (cart, viewed products, returning flag), resolves the
 * usable rules' sources in order, and returns the rail for the requested
 * slot with no product repeated across slots. With no rules at all the
 * newest products are shown in slot 1 so the block works before the
 * merchant has configured anything.
 */
export async function recommendForShopper(
  db: PrismaClient,
  graphql: AdminGraphqlClient,
  request: SmartRecommendationRequest,
): Promise<SmartRecommendationResponse> {
  const cap = Math.max(1, request.maxProducts ?? 12);
  const slot = Math.max(1, request.slot);
  const inCart = new Set(request.cartProductIds);

  const rules = await db.recommendationRule.findMany({
    where: { shop: request.shop, status: "ACTIVE" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  if (rules.length === 0) {
    if (slot !== 1) return EMPTY_RESPONSE;
    const newest = await getRecentProducts(graphql, 40);
    return {
      products: newest
        .filter((product) => !inCart.has(product.id))
        .slice(0, Math.min(cap, 4))
        .map(toProduct),
      heading: null,
      ruleId: null,
      fallbackUsed: true,
    };
  }

  let collectionIds: string[] = [];
  if (needsCollections(rules) && request.cartProductIds.length > 0) {
    try {
      const byProduct = await getProductCollectionIds(graphql, request.cartProductIds);
      collectionIds = [...new Set([...byProduct.values()].flat())];
    } catch (error) {
      console.error("Cart collection lookup failed:", error);
    }
  }

  const facts: ShopperFacts = {
    productIds: request.cartProductIds,
    collectionIds,
    total: request.cartTotal,
    viewedProductIds: request.viewedProductIds,
    viewedCollectionIds: request.viewedCollectionIds,
    returning: request.returning,
  };

  const matched = pickRules(rules, facts).slice(0, slot);
  if (matched.length < slot) return EMPTY_RESPONSE;

  const target = matched[slot - 1];
  if (target.source === "RELATED_TO_VIEWED") {
    return {
      products: [],
      heading: target.heading?.trim() || null,
      ruleId: target.id,
      fallbackUsed: false,
      related: {
        seedProductId: numericId(request.viewedProductIds[0]),
        limit: Math.min(cap, target.limit),
        minPrice: target.minPrice,
        maxPrice: target.maxPrice,
        excludeCartItems: target.excludeCartItems,
      },
    };
  }

  const pools = new Map<number, SmartRecommendedProduct[]>();
  for (const rule of matched) {
    try {
      pools.set(rule.id, (await sourceProducts(graphql, rule, facts)).map(toProduct));
    } catch (error) {
      console.error("Recommendation rule source fetch failed:", rule.id, error);
      pools.set(rule.id, []);
    }
  }

  const rails = assembleRails(matched, pools, inCart, cap);
  return {
    products: rails[slot - 1] ?? [],
    heading: target.heading?.trim() || null,
    ruleId: target.id,
    fallbackUsed: false,
  };
}
```

Note: `assembleRails` needs `RailRule` fields (`id`, `limit`, `minPrice`, `maxPrice`, `excludeCartItems`); Prisma's `RecommendationRule` has all of them, so `matched` is passed directly. `pickRules` needs `RuleLike` (`position`, `trigger`, the trigger columns, `source`); Prisma's model provides those too, and the enum literals line up with the union types from Task 2.

- [ ] **Step 2: Typecheck the module**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "smartRecommendations|smartRules|smartRails|proxy.smart" || echo "no errors in recommendations"`
Expected: only one error, in `app/routes/proxy.smart-recommendations/route.tsx` (`recommendForCart` no longer exists). Fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add app/services/recommendations/smartRecommendations.server.ts
git commit -m "Recommendations: recommendForShopper resolves stacked rails, recently viewed, and related seeds"
```

---

### Task 6: Proxy route

**Files:**
- Modify: `app/routes/proxy.smart-recommendations/route.tsx`

- [ ] **Step 1: Rewrite the route**

Replace the whole file with:

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { shopHasRecommendations } from "app/services/recommendations/entitlement.server";
import { parseShopperParams } from "app/services/recommendations/shopperParams";
import {
  EMPTY_RESPONSE,
  recommendForShopper,
} from "app/services/recommendations/smartRecommendations.server";

/**
 * App Proxy endpoint for the Smart Recommendations home page block.
 *
 * Reached at `/apps/quali8/smart-recommendations?cart=<id,id>&total=<n>
 * &viewed=<id,id>&viewedCollections=<id,id>&returning=0|1&slot=<1-3>
 * &limit=<1-12>`. `cart`/`total` describe the live cart, `viewed*` come
 * from the tracker embed's localStorage, `slot` says which matching rule
 * this block instance shows. The merchant's rules decide what to show.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  // Same answer for the same signals — a short shared cache absorbs traffic.
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop || !admin) {
    return Response.json(EMPTY_RESPONSE, { headers });
  }

  try {
    if (!(await shopHasRecommendations(shop, db))) {
      return Response.json(EMPTY_RESPONSE, { headers });
    }

    const params = parseShopperParams(url.searchParams);
    const payload = await recommendForShopper(db, admin.graphql, {
      shop,
      cartProductIds: params.cartProductIds,
      cartTotal: params.cartTotal,
      viewedProductIds: params.viewedProductIds,
      viewedCollectionIds: params.viewedCollectionIds,
      returning: params.returning,
      slot: params.slot,
      maxProducts: params.limit,
    });

    return Response.json(payload, { headers });
  } catch (error) {
    console.error("Error in /proxy/smart-recommendations:", error); // eslint-disable-line no-console
    return Response.json(EMPTY_RESPONSE, { headers });
  }
};
```

- [ ] **Step 2: Run the unit tests and typecheck**

Run: `npx vitest run app/services/recommendations && npx tsc --noEmit -p .`
Expected: all recommendation tests pass; `tsc` reports errors only in `app/routes/app.recommendations.$id/loader/index.ts` (the `RuleDetail.trigger`/`source` unions are narrower than Prisma's enums now). Fixed in Task 7.

- [ ] **Step 3: Commit**

```bash
git add app/routes/proxy.smart-recommendations/route.tsx
git commit -m "Recommendations proxy: accept viewed, returning and slot signals from the home page block"
```

---

### Task 7: Admin rule editor — new triggers and sources

**Files:**
- Modify: `app/routes/app.recommendations.$id/loader/index.ts` (the `RuleDetail` type)
- Modify: `app/routes/app.recommendations.$id/action/index.ts` (zod enums, validation, data mapping)
- Modify: `app/routes/app.recommendations.$id/route.tsx` (option lists, conditional pickers, copy)

- [ ] **Step 1: Widen the `RuleDetail` unions in the loader**

In `app/routes/app.recommendations.$id/loader/index.ts` replace the two union lines:

```ts
  trigger:
    | "ALWAYS"
    | "CART_HAS_COLLECTION"
    | "CART_HAS_PRODUCT"
    | "CART_TOTAL_MIN"
    | "VIEWED_COLLECTION"
    | "VIEWED_PRODUCT"
    | "RETURNING_VISITOR";
```

and

```ts
  source:
    | "COLLECTION"
    | "TAG"
    | "NEWEST"
    | "PRODUCTS"
    | "RECENTLY_VIEWED"
    | "RELATED_TO_VIEWED";
```

- [ ] **Step 2: Update the action's schema, validation and mapping**

In `app/routes/app.recommendations.$id/action/index.ts`:

Replace the two `z.enum` lines:

```ts
  trigger: z.enum([
    "ALWAYS",
    "CART_HAS_COLLECTION",
    "CART_HAS_PRODUCT",
    "CART_TOTAL_MIN",
    "VIEWED_COLLECTION",
    "VIEWED_PRODUCT",
    "RETURNING_VISITOR",
  ]),
```

```ts
  source: z.enum([
    "COLLECTION",
    "TAG",
    "NEWEST",
    "PRODUCTS",
    "RECENTLY_VIEWED",
    "RELATED_TO_VIEWED",
  ]),
```

Replace the trigger validation block (the three `if (body.trigger === …)` checks) with:

```ts
    const needsCollection =
      body.trigger === "CART_HAS_COLLECTION" || body.trigger === "VIEWED_COLLECTION";
    const needsProduct =
      body.trigger === "CART_HAS_PRODUCT" || body.trigger === "VIEWED_PRODUCT";
    if (needsCollection && !body.triggerCollectionId) {
      problems.push(
        body.trigger === "CART_HAS_COLLECTION"
          ? "Choose the collection the cart must contain"
          : "Choose the collection the shopper must have viewed",
      );
    }
    if (needsProduct && !body.triggerProductId) {
      problems.push(
        body.trigger === "CART_HAS_PRODUCT"
          ? "Choose the product the cart must contain"
          : "Choose the product the shopper must have viewed",
      );
    }
    if (body.trigger === "CART_TOTAL_MIN" && body.triggerMinTotal === null) {
      problems.push("Enter the minimum cart total");
    }
```

Replace the trigger lines inside `const data = { … }` with:

```ts
      triggerCollectionId: needsCollection ? body.triggerCollectionId : null,
      triggerCollectionTitle: needsCollection ? body.triggerCollectionTitle : null,
      triggerProductId: needsProduct ? body.triggerProductId : null,
      triggerProductTitle: needsProduct ? body.triggerProductTitle : null,
      triggerMinTotal: body.trigger === "CART_TOTAL_MIN" ? body.triggerMinTotal : null,
```

- [ ] **Step 3: Update the editor UI**

In `app/routes/app.recommendations.$id/route.tsx`:

Replace `TRIGGER_OPTIONS` and `SOURCE_OPTIONS`:

```ts
const TRIGGER_OPTIONS = [
  { label: "Every visitor", value: "ALWAYS" },
  { label: "Returning visitor (first seen before today)", value: "RETURNING_VISITOR" },
  { label: "Shopper viewed a product from a collection", value: "VIEWED_COLLECTION" },
  { label: "Shopper viewed a specific product", value: "VIEWED_PRODUCT" },
  { label: "Cart has a product from a collection", value: "CART_HAS_COLLECTION" },
  { label: "Cart has a specific product", value: "CART_HAS_PRODUCT" },
  { label: "Cart total is at least…", value: "CART_TOTAL_MIN" },
];

const SOURCE_OPTIONS = [
  { label: "Products from a collection", value: "COLLECTION" },
  { label: "Products with a tag", value: "TAG" },
  { label: "Newest products", value: "NEWEST" },
  { label: "Products I pick", value: "PRODUCTS" },
  { label: "Recently viewed products", value: "RECENTLY_VIEWED" },
  { label: "Related to what they viewed (Shopify related products)", value: "RELATED_TO_VIEWED" },
];
```

In the "When" card, change the subdued help text from `The condition the cart must meet for this rule to apply.` to:

```tsx
                    The condition the shopper must meet for this rule to apply.
                    Viewed and returning conditions need the Smart recs tracker
                    embed turned on in the theme editor.
```

Change the two conditional pickers so they render for both cart and viewed variants:

```tsx
                {trigger === "CART_HAS_COLLECTION" || trigger === "VIEWED_COLLECTION" ? (
```

and

```tsx
                {trigger === "CART_HAS_PRODUCT" || trigger === "VIEWED_PRODUCT" ? (
```

In the "Show" card, after the `{source === "PRODUCTS" ? ( … ) : null}` block add:

```tsx
                {source === "RECENTLY_VIEWED" ? (
                  <Text as="p" tone="subdued" variant="bodySm">
                    Shows the products this shopper opened most recently. Needs
                    the tracker embed.
                  </Text>
                ) : null}
                {source === "RELATED_TO_VIEWED" ? (
                  <Text as="p" tone="subdued" variant="bodySm">
                    Shows Shopify&rsquo;s related products for the product this
                    shopper opened last. Needs the tracker embed.
                  </Text>
                ) : null}
```

Change the heading field's `helpText` from `Replaces the block's heading when this rule matches.` to `Shown above the products on the home page when this rule matches.`

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/routes/app.recommendations.\$id/loader/index.ts app/routes/app.recommendations.\$id/action/index.ts app/routes/app.recommendations.\$id/route.tsx
git commit -m "Recommendations editor: viewed, returning, recently viewed and related options"
```

---

### Task 8: Theme editor deep links (pure)

**Files:**
- Create: `app/services/recommendations/themeEditorLinks.ts`
- Create: `app/services/recommendations/themeEditorLinks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/services/recommendations/themeEditorLinks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { themeEditorLinks } from "./themeEditorLinks";

describe("themeEditorLinks", () => {
  it("builds the add-block and enable-embed editor URLs for the shop", () => {
    const links = themeEditorLinks("my-shop.myshopify.com", "abc-123");
    expect(links.addBlock).toBe(
      "https://my-shop.myshopify.com/admin/themes/current/editor?context=apps&template=index&addAppBlockId=abc-123%2Fsmart-recommendations&target=newAppsSection",
    );
    expect(links.enableTracker).toBe(
      "https://my-shop.myshopify.com/admin/themes/current/editor?context=apps&activateAppId=abc-123%2Fsmart-tracker",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/services/recommendations/themeEditorLinks.test.ts`
Expected: FAIL — cannot find module `./themeEditorLinks`.

- [ ] **Step 3: Implement `app/services/recommendations/themeEditorLinks.ts`**

```ts
/**
 * Deep links into the theme editor for the Smart Recommendations setup
 * card: one adds the home page block, one turns on the tracker embed.
 * The extension uid is the `uid` in extensions/theme-quali8/shopify.extension.toml;
 * a dev app with its own uid can override it with SHOPIFY_THEME_EXTENSION_UID.
 */

export const THEME_EXTENSION_UID_FALLBACK = "1f374334-5b35-41d0-63a6-71f08e77864cb4c3ceff";

export type ThemeEditorLinks = {
  addBlock: string;
  enableTracker: string;
};

export function themeEditorLinks(shop: string, extensionUid: string): ThemeEditorLinks {
  const editor = `https://${shop}/admin/themes/current/editor`;
  const addBlock = new URLSearchParams({
    context: "apps",
    template: "index",
    addAppBlockId: `${extensionUid}/smart-recommendations`,
    target: "newAppsSection",
  });
  const enableTracker = new URLSearchParams({
    context: "apps",
    activateAppId: `${extensionUid}/smart-tracker`,
  });
  return {
    addBlock: `${editor}?${addBlock.toString()}`,
    enableTracker: `${editor}?${enableTracker.toString()}`,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/services/recommendations/themeEditorLinks.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add app/services/recommendations/themeEditorLinks.ts app/services/recommendations/themeEditorLinks.test.ts
git commit -m "Recommendations: theme editor deep links for the home page block and tracker"
```

---

### Task 9: Admin rule list — descriptions, setup card, home page copy

**Files:**
- Modify: `app/routes/app.recommendations._index/loader/index.ts`
- Modify: `app/routes/app.recommendations._index/route.tsx`

- [ ] **Step 1: Loader — describe the new values and return setup links**

In `app/routes/app.recommendations._index/loader/index.ts`:

Add the import:

```ts
import {
  THEME_EXTENSION_UID_FALLBACK,
  themeEditorLinks,
  type ThemeEditorLinks,
} from "app/services/recommendations/themeEditorLinks";
```

Replace the `when` block with:

```ts
          let when = "Every visitor";
          if (rule.trigger === "RETURNING_VISITOR") {
            when = "Returning visitor";
          } else if (rule.trigger === "VIEWED_COLLECTION") {
            when = `Viewed a product from ${rule.triggerCollectionTitle ?? "a collection"}`;
          } else if (rule.trigger === "VIEWED_PRODUCT") {
            when = `Viewed ${rule.triggerProductTitle ?? "a product"}`;
          } else if (rule.trigger === "CART_HAS_COLLECTION") {
            when = `Cart has a product from ${rule.triggerCollectionTitle ?? "a collection"}`;
          } else if (rule.trigger === "CART_HAS_PRODUCT") {
            when = `Cart has ${rule.triggerProductTitle ?? "a product"}`;
          } else if (rule.trigger === "CART_TOTAL_MIN") {
            when = `Cart total is at least ${money(rule.triggerMinTotal ?? 0)}`;
          }
```

Add two branches to the `show` chain, before the price-range block:

```ts
          } else if (rule.source === "RECENTLY_VIEWED") {
            show = "Recently viewed products";
          } else if (rule.source === "RELATED_TO_VIEWED") {
            show = "Related to what they viewed";
          }
```

(The chain becomes `COLLECTION` → `TAG` → `PRODUCTS` → `RECENTLY_VIEWED` → `RELATED_TO_VIEWED`.)

Change the success payload type and value:

```ts
    return handleApiSuccess<{ rules: RuleRow[]; setup: ThemeEditorLinks }>({
      payload: {
        setup: themeEditorLinks(
          session.shop,
          process.env.SHOPIFY_THEME_EXTENSION_UID || THEME_EXTENSION_UID_FALLBACK,
        ),
        rules: rules.map((rule) => {
```

- [ ] **Step 2: Route — setup card and copy**

In `app/routes/app.recommendations._index/route.tsx`:

Read the setup links next to `rules`:

```ts
  const rules = loaderData?.payload?.rules ?? [];
  const setup = loaderData?.payload?.setup ?? null;
```

Replace the file's doc comment:

```ts
/**
 * Smart Recommendations: the merchant's rules for the home page block.
 * Rules are checked top to bottom; the first one whose condition matches
 * the shopper decides what the block shows (a second block set to
 * "2nd matching rule" shows the next one).
 */
```

Replace the `FeatureHeader` tagline with:

```
Rules decide what the home page suggests. The first rule that matches the shopper wins; with no rules, shoppers see your newest products.
```

Insert a setup card as the first `Layout.Section`, above the rules table:

```tsx
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Set up the home page block
              </Text>
              <List type="number">
                <List.Item>
                  Add the <strong>Smart Recommendations</strong> block to your
                  home page and place it where you want the rail.
                </List.Item>
                <List.Item>
                  Turn on the <strong>Smart recs tracker</strong> app embed so
                  viewed products and returning visitors count. Without it only
                  cart and &ldquo;every visitor&rdquo; rules can fire.
                </List.Item>
              </List>
              {setup ? (
                <InlineStack gap="200">
                  <Button url={setup.addBlock} target="_blank" variant="primary">
                    Add block to home page
                  </Button>
                  <Button url={setup.enableTracker} target="_blank">
                    Turn on tracker embed
                  </Button>
                </InlineStack>
              ) : null}
            </BlockStack>
          </Card>
        </Layout.Section>
```

Add `InlineStack` to the Polaris import.

Replace the `EmptyState` paragraph with:

```tsx
                <p>
                  For example: when a shopper viewed a product from Bouquets,
                  show vases under $40 on the home page. Until you add a rule,
                  the home page block shows your newest products.
                </p>
```

Replace the "How rules work" list items with:

```tsx
                  <List.Item>
                    <strong>When</strong> is the condition: every visitor, a
                    returning visitor, the shopper viewed a product or a
                    collection, or the cart contains a product, a collection,
                    or a minimum total.
                  </List.Item>
                  <List.Item>
                    <strong>Show</strong> is the source: a collection, a tag,
                    your newest products, products you pick by hand, recently
                    viewed products, or products related to what they viewed.
                    Add an optional price range and a maximum.
                  </List.Item>
                  <List.Item>
                    Rules are checked top to bottom, so put your most specific
                    rule first. Products already in the cart are skipped when
                    the rule says so, and a product never repeats across
                    stacked blocks.
                  </List.Item>
```

Replace the "Where shoppers see it" list items with:

```tsx
                  <List.Item>
                    Recommendations appear in the <strong>Smart Recommendations</strong>
                    block on your home page: image, title, price, and a quick Add
                    button.
                  </List.Item>
                  <List.Item>
                    Add the block more than once and set each copy to the 1st,
                    2nd or 3rd matching rule to stack rails.
                  </List.Item>
                  <List.Item>
                    A rule&rsquo;s own heading is shown above its products when it
                    matches; otherwise the block&rsquo;s fallback heading.
                  </List.Item>
```

Replace the delete modal sentence:

```tsx
              ? `"${deleteTarget.name}" will be removed. The home page block will fall through to the next rule.`
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/routes/app.recommendations._index/loader/index.ts app/routes/app.recommendations._index/route.tsx
git commit -m "Recommendations list: home page copy, viewed descriptions, theme editor setup card"
```

---

### Task 10: Tracker app embed

**Files:**
- Create: `extensions/theme-quali8/blocks/smart-tracker.liquid`
- Create: `extensions/theme-quali8/assets/smart-tracker.js`

- [ ] **Step 1: Create the embed**

`extensions/theme-quali8/blocks/smart-tracker.liquid`:

```liquid
{%- comment -%}
  Quali8 — Smart recs tracker (app embed, every page).

  Records what the shopper looks at so the Smart Recommendations home page
  block can react to it: on product pages it stores the product and its
  collections in the browser (localStorage, newest first, 12 at most), and
  on every page it stores the date of the shopper's first visit. Nothing is
  sent anywhere; the home page block reads the browser storage and passes
  it to the app when it asks for recommendations. Renders nothing visible.
{%- endcomment -%}

<span
  data-quali8-tracker
  {%- if template.name == 'product' and product %}
  data-product-id="{{ product.id }}"
  data-collection-ids="{{ product.collections | map: 'id' | join: ',' }}"
  {%- endif %}
  hidden
></span>

{% schema %}
{
  "name": "Smart recs tracker",
  "target": "body",
  "javascript": "smart-tracker.js",
  "settings": [
    {
      "type": "paragraph",
      "content": "Remembers which products a shopper opens (in their own browser only) so the Smart Recommendations block on the home page can use \"viewed\" and \"returning visitor\" rules. Nothing to configure."
    }
  ]
}
{% endschema %}
```

`extensions/theme-quali8/assets/smart-tracker.js`:

```js
/*
 * Quali8 — Smart recs tracker (app embed).
 *
 * localStorage keys shared with smart-recommendations.js:
 *   q8-viewed      JSON array, newest first, max 12:
 *                  [{ id: "123", collections: ["4", "5"], at: 1690000000000 }]
 *   q8-first-seen  "YYYY-MM-DD" (browser local date) of the first visit.
 * Every storage access is wrapped in try/catch (private mode, blocked
 * storage). Nothing is sent to the network.
 */
(function () {
  var VIEWED_KEY = "q8-viewed";
  var FIRST_SEEN_KEY = "q8-first-seen";
  var MAX_VIEWED = 12;

  var node = document.querySelector("[data-quali8-tracker]");
  if (!node) return;

  function readJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* private mode */
    }
  }

  function localDate() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + "-" + (m.length === 1 ? "0" + m : m) + "-" + (day.length === 1 ? "0" + day : day);
  }

  // First visit date, stored once.
  var firstSeen = null;
  try {
    firstSeen = window.localStorage.getItem(FIRST_SEEN_KEY);
  } catch (e) {
    /* private mode */
  }
  if (!firstSeen) write(FIRST_SEEN_KEY, localDate());

  // Product views.
  var productId = node.getAttribute("data-product-id");
  if (!productId || !/^\d+$/.test(productId)) return;

  var collections = (node.getAttribute("data-collection-ids") || "")
    .split(",")
    .map(function (id) { return id.trim(); })
    .filter(function (id) { return /^\d+$/.test(id); });

  var viewed = readJson(VIEWED_KEY, []);
  if (!Array.isArray(viewed)) viewed = [];
  viewed = viewed.filter(function (entry) {
    return entry && String(entry.id) !== productId;
  });
  viewed.unshift({ id: productId, collections: collections, at: Date.now() });
  write(VIEWED_KEY, JSON.stringify(viewed.slice(0, MAX_VIEWED)));
})();
```

- [ ] **Step 2: Sanity-check the JS parses**

Run: `node --check extensions/theme-quali8/assets/smart-tracker.js && echo ok`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add extensions/theme-quali8/blocks/smart-tracker.liquid extensions/theme-quali8/assets/smart-tracker.js
git commit -m "Theme: Smart recs tracker embed records viewed products and first visit"
```

---

### Task 11: Home page block — Liquid and CSS

**Files:**
- Create: `extensions/theme-quali8/blocks/smart-recommendations.liquid`
- Create: `extensions/theme-quali8/assets/smart-recommendations.css`

- [ ] **Step 1: Create the block Liquid**

`extensions/theme-quali8/blocks/smart-recommendations.liquid`:

```liquid
{%- comment -%}
  Quali8 — Smart Recommendations (home page app block).

  A rail of products chosen by the merchant's rules in the app (Smart
  Recommendations page): what's in the cart, what the shopper viewed (via
  the Smart recs tracker embed), and whether they're a returning visitor.
  Each card links to the product and has a quick Add button. Add the block
  more than once with different "Rail" settings to stack rails; products
  never repeat across them. Stays hidden (zero layout shift) until it has
  products.
{%- endcomment -%}

<div
  class="q8-sr q8-sr--{{ block.settings.layout }} q8-sr--btn-{{ block.settings.button_style }}"
  data-quali8-smart-recs
  data-slot="{{ block.settings.rail }}"
  data-limit="{{ block.settings.products }}"
  data-currency="{{ cart.currency.iso_code | default: shop.currency }}"
  data-fallback-heading="{{ block.settings.fallback_heading | escape }}"
  data-add-label="{{ block.settings.add_label | escape }}"
  data-view-label="{{ block.settings.view_label | escape }}"
  data-show-price="{{ block.settings.show_price }}"
  style="
    --q8-sr-bg: {{ block.settings.background_color }};
    --q8-sr-text: {{ block.settings.text_color }};
    --q8-sr-accent: {{ block.settings.accent_color }};
    --q8-sr-btn-bg: {{ block.settings.button_background }};
    --q8-sr-btn-text: {{ block.settings.button_text_color }};
    --q8-sr-heading-size: {{ block.settings.heading_size }}px;
    --q8-sr-radius: {{ block.settings.border_radius }}px;
    --q8-sr-card-radius: {{ block.settings.card_radius }}px;
    --q8-sr-padding: {{ block.settings.padding }}px;
    --q8-sr-card-width: {{ block.settings.card_width }}px;
    --q8-sr-border: {% if block.settings.show_border %}1px solid rgba(0, 0, 0, 0.08){% else %}none{% endif %};
  "
  hidden
></div>

{% schema %}
{
  "name": "Smart Recommendations",
  "target": "section",
  "javascript": "smart-recommendations.js",
  "stylesheet": "smart-recommendations.css",
  "enabled_on": {
    "templates": ["index"]
  },
  "settings": [
    {
      "type": "paragraph",
      "content": "Which products show is decided by your rules in the app under Smart Recommendations. Turn on the Smart recs tracker app embed so \"viewed\" and \"returning visitor\" rules work."
    },
    {
      "type": "select",
      "id": "rail",
      "label": "Rail",
      "info": "Add this block again with a different rail to stack several.",
      "options": [
        { "value": "1", "label": "1st matching rule" },
        { "value": "2", "label": "2nd matching rule" },
        { "value": "3", "label": "3rd matching rule" }
      ],
      "default": "1"
    },
    {
      "type": "range",
      "id": "products",
      "label": "Products to show",
      "min": 2,
      "max": 12,
      "step": 1,
      "default": 4
    },
    {
      "type": "text",
      "id": "fallback_heading",
      "label": "Heading when the rule has none",
      "default": "You might also like"
    },

    { "type": "header", "content": "Cards" },
    {
      "type": "select",
      "id": "layout",
      "label": "Layout",
      "options": [
        { "value": "rail", "label": "Sideways rail" },
        { "value": "grid", "label": "Grid" }
      ],
      "default": "rail"
    },
    {
      "type": "range",
      "id": "card_width",
      "label": "Card width",
      "min": 140,
      "max": 300,
      "step": 10,
      "unit": "px",
      "default": 200
    },
    {
      "type": "checkbox",
      "id": "show_price",
      "label": "Show price",
      "default": true
    },
    {
      "type": "select",
      "id": "button_style",
      "label": "Button style",
      "options": [
        { "value": "solid", "label": "Solid" },
        { "value": "outline", "label": "Outline" }
      ],
      "default": "solid"
    },
    {
      "type": "text",
      "id": "add_label",
      "label": "Add button",
      "default": "Add to cart"
    },
    {
      "type": "text",
      "id": "view_label",
      "label": "View button",
      "info": "Used when a product has options to choose.",
      "default": "View"
    },
    {
      "type": "range",
      "id": "heading_size",
      "label": "Heading size",
      "min": 16,
      "max": 44,
      "step": 2,
      "unit": "px",
      "default": 24
    },

    { "type": "header", "content": "Colors" },
    {
      "type": "color",
      "id": "background_color",
      "label": "Block background",
      "default": "#ffffff"
    },
    {
      "type": "color",
      "id": "text_color",
      "label": "Text",
      "default": "#1a1a1a"
    },
    {
      "type": "color",
      "id": "accent_color",
      "label": "Accent",
      "info": "Price and focus rings.",
      "default": "#5c3d99"
    },
    {
      "type": "color",
      "id": "button_background",
      "label": "Button",
      "default": "#5c3d99"
    },
    {
      "type": "color",
      "id": "button_text_color",
      "label": "Button text",
      "default": "#ffffff"
    },

    { "type": "header", "content": "Spacing & shape" },
    {
      "type": "range",
      "id": "padding",
      "label": "Inner padding",
      "min": 0,
      "max": 48,
      "step": 4,
      "unit": "px",
      "default": 24
    },
    {
      "type": "range",
      "id": "border_radius",
      "label": "Block corner radius",
      "min": 0,
      "max": 32,
      "step": 2,
      "unit": "px",
      "default": 16
    },
    {
      "type": "range",
      "id": "card_radius",
      "label": "Card corner radius",
      "min": 0,
      "max": 24,
      "step": 2,
      "unit": "px",
      "default": 12
    },
    {
      "type": "checkbox",
      "id": "show_border",
      "label": "Show block border",
      "default": false
    }
  ]
}
{% endschema %}
```

Count: 19 interactive settings, 1 paragraph + 3 headers = 4 non-interactive (cap is 6).

- [ ] **Step 2: Create the stylesheet**

`extensions/theme-quali8/assets/smart-recommendations.css`:

```css
/*
 * Quali8 — Smart Recommendations (home page).
 *
 * A heading and a row of product cards: sideways rail (default) or grid.
 * Colours, sizes, and corners come from CSS variables the Liquid block
 * sets. Every length is in em off the block's own 16px base so the layout
 * doesn't shrink on themes with a 62.5% root font size.
 */

.q8-sr {
  --q8-sr-muted: color-mix(in srgb, var(--q8-sr-text, #1a1a1a) 60%, transparent);
  --q8-sr-line: rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
  font-size: 16px;
  line-height: 1.4;
  font-family: inherit;
  color: var(--q8-sr-text, #1a1a1a);
  background: var(--q8-sr-bg, #ffffff);
  border: var(--q8-sr-border, none);
  border-radius: var(--q8-sr-radius, 16px);
  padding: var(--q8-sr-padding, 24px);
  margin: 1.5em 0;
  animation: q8-sr-in 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.q8-sr *,
.q8-sr *::before,
.q8-sr *::after {
  box-sizing: border-box;
}

@keyframes q8-sr-in {
  from { opacity: 0; transform: translateY(0.5em); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .q8-sr { animation: none; }
}

/* --- Header ------------------------------------------------------------------ */

.q8-sr__heading {
  margin: 0 0 1em;
  font-size: var(--q8-sr-heading-size, 24px);
  font-weight: 600;
  line-height: 1.2;
}

/* --- Track: rail or grid ----------------------------------------------------- */

.q8-sr__track {
  display: grid;
  gap: 1em;
}

.q8-sr--rail .q8-sr__track {
  grid-auto-flow: column;
  grid-auto-columns: var(--q8-sr-card-width, 200px);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  padding-bottom: 0.5em;
  scrollbar-width: thin;
}

.q8-sr--rail .q8-sr__card {
  scroll-snap-align: start;
}

.q8-sr--grid .q8-sr__track {
  grid-template-columns: repeat(auto-fill, minmax(var(--q8-sr-card-width, 200px), 1fr));
}

/* --- Card -------------------------------------------------------------------- */

.q8-sr__card {
  display: flex;
  flex-direction: column;
  gap: 0.6em;
  min-width: 0;
}

.q8-sr__media-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.q8-sr__media {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--q8-sr-card-radius, 12px);
  background: color-mix(in srgb, var(--q8-sr-text, #1a1a1a) 6%, transparent);
}

.q8-sr__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 240ms ease;
}

.q8-sr__card:hover .q8-sr__media img {
  transform: scale(1.03);
}

.q8-sr__title {
  margin: 0;
  font-size: 1em;
  font-weight: 500;
  line-height: 1.3;
}

.q8-sr__title a {
  color: inherit;
  text-decoration: none;
}

.q8-sr__title a:hover {
  text-decoration: underline;
}

.q8-sr__price {
  font-size: 0.95em;
  color: var(--q8-sr-accent, #5c3d99);
  font-weight: 600;
}

/* --- Button ------------------------------------------------------------------ */

.q8-sr__button {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75em;
  padding: 0 1em;
  border-radius: calc(var(--q8-sr-card-radius, 12px) * 0.75);
  border: 1px solid var(--q8-sr-btn-bg, #5c3d99);
  background: var(--q8-sr-btn-bg, #5c3d99);
  color: var(--q8-sr-btn-text, #ffffff);
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 160ms ease;
}

.q8-sr--btn-outline .q8-sr__button {
  background: transparent;
  color: var(--q8-sr-btn-bg, #5c3d99);
}

.q8-sr__button:hover:not(:disabled) {
  opacity: 0.85;
}

.q8-sr__button:disabled {
  cursor: default;
  opacity: 0.6;
}

.q8-sr__button:focus-visible,
.q8-sr__media-link:focus-visible,
.q8-sr__title a:focus-visible {
  outline: 2px solid var(--q8-sr-accent, #5c3d99);
  outline-offset: 2px;
}

.q8-sr__error {
  margin: 0.75em 0 0;
  font-size: 0.9em;
  color: #b42318;
}
```

- [ ] **Step 3: Commit**

```bash
git add extensions/theme-quali8/blocks/smart-recommendations.liquid extensions/theme-quali8/assets/smart-recommendations.css
git commit -m "Theme: Smart Recommendations home page block markup, settings and styles"
```

---

### Task 12: Home page block — script

**Files:**
- Create: `extensions/theme-quali8/assets/smart-recommendations.js`

- [ ] **Step 1: Create the script**

`extensions/theme-quali8/assets/smart-recommendations.js`:

```js
/*
 * Quali8 — Smart Recommendations (home page).
 *
 * Reads three signals — the live cart (/cart.js), the products the shopper
 * viewed (localStorage written by the Smart recs tracker embed), and the
 * first-visit date — asks the app proxy which rule applies for this block's
 * rail slot, and renders the products. For "related to what they viewed"
 * rules the app returns a seed product and the block asks Shopify's public
 * /recommendations/products.json itself. Cards link to the product; the
 * quick Add button posts to /cart/add.js. The block stays hidden until it
 * has something to show.
 *
 * All DOM is built with createElement/textContent — never innerHTML with
 * remote data.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var VIEWED_KEY = "q8-viewed"; // written by smart-tracker.js
  var FIRST_SEEN_KEY = "q8-first-seen";

  var blocks = document.querySelectorAll("[data-quali8-smart-recs]");
  if (!blocks.length) return;

  // --- Utilities -------------------------------------------------------------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatMoney(amount, currency) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || "en", {
        style: "currency",
        currency: currency || "USD",
      }).format(amount);
    } catch (e) {
      return "$" + Number(amount).toFixed(2);
    }
  }

  function numericId(value) {
    return String(value || "").split("/").pop();
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function localDate() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + "-" + (m.length === 1 ? "0" + m : m) + "-" + (day.length === 1 ? "0" + day : day);
  }

  function fetchJson(path) {
    return fetch(ROOT + path, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  // --- Signals ---------------------------------------------------------------

  function readViewed() {
    var viewed = [];
    try {
      viewed = JSON.parse(storageGet(VIEWED_KEY) || "[]");
    } catch (e) {
      viewed = [];
    }
    if (!Array.isArray(viewed)) viewed = [];
    var productIds = [];
    var collectionIds = [];
    viewed.forEach(function (entry) {
      if (!entry || !/^\d+$/.test(String(entry.id))) return;
      productIds.push(String(entry.id));
      (entry.collections || []).forEach(function (id) {
        if (/^\d+$/.test(String(id)) && collectionIds.indexOf(String(id)) === -1) collectionIds.push(String(id));
      });
    });
    return { productIds: productIds.slice(0, 12), collectionIds: collectionIds.slice(0, 24) };
  }

  function isReturning() {
    var firstSeen = storageGet(FIRST_SEEN_KEY);
    return Boolean(firstSeen) && firstSeen !== localDate();
  }

  function fetchCart() {
    return fetchJson("cart.js").catch(function () {
      return { items: [], items_subtotal_price: 0 };
    });
  }

  function fetchRail(block, cart) {
    var viewed = readViewed();
    var params = new URLSearchParams();
    params.set(
      "cart",
      (cart.items || []).map(function (item) { return item.product_id; }).filter(Boolean).join(","),
    );
    params.set("total", String((cart.items_subtotal_price || 0) / 100));
    params.set("viewed", viewed.productIds.join(","));
    params.set("viewedCollections", viewed.collectionIds.join(","));
    params.set("returning", isReturning() ? "1" : "0");
    params.set("slot", block.dataset.slot || "1");
    params.set("limit", block.dataset.limit || "4");
    return fetchJson("apps/quali8/smart-recommendations?" + params.toString());
  }

  /** Shopify's public related products for a seed, mapped to the app's product shape and filtered. */
  function fetchRelated(related, inCart) {
    var params = new URLSearchParams();
    params.set("product_id", related.seedProductId);
    params.set("limit", String(Math.min(12, Math.max(1, related.limit || 4)) + 4));
    params.set("intent", "related");
    return fetchJson("recommendations/products.json?" + params.toString()).then(function (data) {
      var out = [];
      ((data && data.products) || []).forEach(function (product) {
        if (out.length >= related.limit) return;
        var id = String(product.id);
        if (related.excludeCartItems && inCart[id]) return;
        var price = Number(product.price) / 100;
        if (related.minPrice != null && price < related.minPrice) return;
        if (related.maxPrice != null && price > related.maxPrice) return;
        var variant = (product.variants || []).filter(function (v) { return v.available; })[0];
        out.push({
          productId: id,
          variantId: variant ? String(variant.id) : null,
          title: product.title,
          price: price,
          imageUrl: product.featured_image || null,
          handle: product.handle || null,
          hasOptions: (product.variants || []).length > 1,
        });
      });
      return out;
    });
  }

  // --- Cart ------------------------------------------------------------------

  function addVariant(variantId) {
    return fetch(ROOT + "cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] }),
    }).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) {
          throw new Error((payload && (payload.description || payload.message)) || "HTTP " + response.status);
        }
        return payload;
      });
    });
  }

  function announceCartChange(payload) {
    try {
      document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true, detail: payload }));
      document.dispatchEvent(new CustomEvent("quali8:cart:added", { bubbles: true, detail: payload }));
    } catch (e) {
      /* nothing to announce to */
    }
  }

  // --- Render ----------------------------------------------------------------

  function productCard(block, product, inCart, errorLine) {
    var ds = block.dataset;
    var card = el("article", "q8-sr__card");
    var productUrl = product.handle ? ROOT + "products/" + product.handle : null;

    var media = el("div", "q8-sr__media");
    if (product.imageUrl) {
      var img = document.createElement("img");
      img.src = product.imageUrl;
      img.alt = product.title || "";
      img.loading = "lazy";
      media.appendChild(img);
    }
    if (productUrl) {
      var mediaLink = document.createElement("a");
      mediaLink.className = "q8-sr__media-link";
      mediaLink.href = productUrl;
      mediaLink.setAttribute("aria-label", product.title || "");
      mediaLink.appendChild(media);
      card.appendChild(mediaLink);
    } else {
      card.appendChild(media);
    }

    var title = el("h3", "q8-sr__title");
    if (productUrl) {
      var titleLink = document.createElement("a");
      titleLink.href = productUrl;
      titleLink.textContent = product.title || "";
      title.appendChild(titleLink);
    } else {
      title.textContent = product.title || "";
    }
    card.appendChild(title);

    if (ds.showPrice !== "false" && typeof product.price === "number") {
      card.appendChild(el("span", "q8-sr__price", formatMoney(product.price, ds.currency)));
    }

    var pid = numericId(product.productId);
    var canQuickAdd = Boolean(product.variantId) && !product.hasOptions;
    if (canQuickAdd) {
      var button = el("button", "q8-sr__button", inCart[pid] ? ds.addLabel + " ✓" : ds.addLabel || "Add to cart");
      button.type = "button";
      if (inCart[pid]) button.disabled = true;
      button.addEventListener("click", function () {
        button.disabled = true;
        errorLine.hidden = true;
        addVariant(product.variantId)
          .then(function (payload) {
            button.textContent = (ds.addLabel || "Add to cart") + " ✓";
            announceCartChange(payload);
          })
          .catch(function (error) {
            button.disabled = false;
            errorLine.textContent = (error && error.message) || "Could not add to cart.";
            errorLine.hidden = false;
          });
      });
      card.appendChild(button);
    } else if (productUrl) {
      var view = document.createElement("a");
      view.className = "q8-sr__button";
      view.href = productUrl;
      view.textContent = ds.viewLabel || "View";
      card.appendChild(view);
    }
    return card;
  }

  function render(block, heading, products, inCart) {
    block.textContent = "";
    if (!products.length) {
      block.hidden = true;
      return;
    }
    block.appendChild(el("h2", "q8-sr__heading", heading || block.dataset.fallbackHeading || "You might also like"));
    var track = el("div", "q8-sr__track");
    var errorLine = el("p", "q8-sr__error");
    errorLine.hidden = true;
    products.forEach(function (product) {
      track.appendChild(productCard(block, product, inCart, errorLine));
    });
    block.appendChild(track);
    block.appendChild(errorLine);
    block.hidden = false;
  }

  // --- Boot ------------------------------------------------------------------

  fetchCart().then(function (cart) {
    var inCart = {};
    (cart.items || []).forEach(function (item) { inCart[String(item.product_id)] = true; });

    Array.prototype.forEach.call(blocks, function (block) {
      fetchRail(block, cart)
        .then(function (data) {
          if (data && data.related) {
            return fetchRelated(data.related, inCart).then(function (products) {
              render(block, data.heading, products, inCart);
            });
          }
          render(block, data && data.heading, (data && data.products) || [], inCart);
        })
        .catch(function () {
          block.hidden = true;
        });
    });
  });
})();
```

Note on `hasOptions`: products from the app proxy (`SmartRecommendedProduct`) do not carry that flag, so they always quick-add their first sellable variant, matching what the cart block did. Products from the related endpoint use View when they have more than one variant, because the shopper must choose.

- [ ] **Step 2: Sanity-check the JS parses**

Run: `node --check extensions/theme-quali8/assets/smart-recommendations.js && echo ok`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add extensions/theme-quali8/assets/smart-recommendations.js
git commit -m "Theme: Smart Recommendations block reads cart, viewed and returning signals and renders the rail"
```

---

### Task 13: Remove the rail from the delivery-checkout cart block

**Files:**
- Modify: `extensions/theme-quali8/assets/delivery-checkout.js` (around lines 16, 322–329, 1431–1439, 1465–1466, 1731–1732)
- Modify: `extensions/theme-quali8/blocks/delivery-checkout.liquid` (line 9 of the header comment)

- [ ] **Step 1: Delete the smart fetch helper**

In `delivery-checkout.js` remove the whole `fetchRecommendations` function:

```js
  function fetchRecommendations(cart) {
    var ids = (cart.items || []).map(function (item) { return item.product_id; }).filter(Boolean);
    var params = new URLSearchParams();
    params.set("cart", ids.join(","));
    params.set("total", String((cart.items_subtotal_price || 0) / 100));
    params.set("limit", "6");
    return fetchJson("apps/quali8/smart-recommendations?" + params.toString());
  }
```

- [ ] **Step 2: Delete the Options-step rail**

Remove this block from the Options step renderer:

```js
    // Smart Recommendations upsell
    var recs = el("div", "q8-dc__recs");
    recs.hidden = true;
    panel.appendChild(recs);
    fetchRecommendations(cartData || { items: [] })
      .then(function (data) {
        renderRecs(recs, data);
      })
      .catch(function () { /* rail stays hidden */ });
```

- [ ] **Step 3: Keep `renderRecs` for the occasion rail, drop the smart-only copy**

In `renderRecs`, replace:

```js
    head.appendChild(el("h4", "q8-dc__section-title", (data && data.heading) || o.recsHeading || "Complete your order"));
    if (o.recsIntro) head.appendChild(el("p", "q8-dc__intro", o.recsIntro));
```

with:

```js
    if (data && data.heading) head.appendChild(el("h4", "q8-dc__section-title", data.heading));
```

In the `settings.options` defaults remove the two lines:

```js
    recsHeading: "Complete your order",
    recsIntro: "",
```

In the file's header comment (lines 13–16) replace:

```js
 * 3. Options (merchant can switch the step, or any field, off): occasion —
 *    picking one shows that occasion's products with one-tap add — card
 *    message, notes (also the cart note), "if nobody answers the door", and
 *    the Smart Recommendations upsell rail.
```

with:

```js
 * 3. Options (merchant can switch the step, or any field, off): occasion —
 *    picking one shows that occasion's products with one-tap add — card
 *    message, notes (also the cart note), and "if nobody answers the door".
```

- [ ] **Step 4: Update the Liquid header comment**

In `delivery-checkout.liquid` change

```
  3) Options (card message, notes, occasion, Smart Recommendations upsell),
```

to

```
  3) Options (card message, notes, occasion, occasion gift picks),
```

- [ ] **Step 5: Verify nothing else references the removed pieces**

Run: `grep -n "fetchRecommendations\|recsHeading\|recsIntro\|smart-recommendations" extensions/theme-quali8/assets/delivery-checkout.js extensions/theme-quali8/blocks/delivery-checkout.liquid; node --check extensions/theme-quali8/assets/delivery-checkout.js && echo parses`
Expected: no grep matches, then `parses`.

- [ ] **Step 6: Commit**

```bash
git add extensions/theme-quali8/assets/delivery-checkout.js extensions/theme-quali8/blocks/delivery-checkout.liquid
git commit -m "Delivery checkout: Smart Recommendations rail moves to the home page block"
```

---

### Task 14: Registry and docs copy

**Files:**
- Modify: `app/components/OneApp/features.ts` (entry `09`, `smart-recommendations`)
- Modify: `CLAUDE.md` (the "Recommendations are two features" paragraph)

- [ ] **Step 1: Update the feature entry**

In `app/components/OneApp/features.ts` replace the `tagline` and `description` of the `smart-recommendations` entry:

```ts
    tagline: "Home page recommendations driven by your rules.",
    description:
      "Set rules like \"when a shopper viewed a bouquet, suggest vases under $40\" and the Smart Recommendations block on your home page shows matching products with one-tap add to cart. Reads the cart, what the shopper viewed, and whether they're a returning visitor.",
```

- [ ] **Step 2: Update CLAUDE.md**

Replace the paragraph starting `**Recommendations are two features; only one has its own theme block.**` with:

```markdown
**Recommendations are two features, each with its own theme block.** *Occasions + Gift Recommendations* (`app.occasions.*`, models `Occasion` / `OccasionProduct` / `OccasionCollection`) feeds the product-page block `occasion-gifts` via `proxy.recommendations` and `recommendProducts.server.ts` (curated products + connected collections + tags, topped up from a general pool so occasions are optional). *Smart Recommendations* (`app.recommendations.*`, model `RecommendationRule`) is the **home-page block `smart-recommendations`** (`enabled_on` `index` only) plus the **`smart-tracker` app embed**, which records viewed products and their collections in localStorage (`q8-viewed`) and the first-visit date (`q8-first-seen`) on product pages. The block reads the cart and that storage and calls `proxy.smart-recommendations` with `cart`, `total`, `viewed`, `viewedCollections`, `returning`, `slot` (1–3, so stacked blocks show the 1st/2nd/3rd matching rule) and `limit`; parsing is the pure `shopperParams.ts`. `smartRecommendations.server.ts` (`recommendForShopper`) evaluates rules in position order with the pure `smartRules.ts` (triggers: every visitor / returning visitor / viewed collection / viewed product / cart has collection / cart has product / cart total ≥; sources: collection / tag / newest / picked products / recently viewed / related to viewed; price range; limit), assembles non-repeating rails with the pure `smartRails.ts`, and returns the requested slot; with no rules slot 1 shows the newest products. `RELATED_TO_VIEWED` is resolved in the block: the proxy returns a `related` seed and filters and the block fetches Shopify's public `recommendations/products.json`. The rules index shows theme-editor deep links (`themeEditorLinks.ts`, uid overridable with `SHOPIFY_THEME_EXTENSION_UID`). To add a feature: add the registry entry, drop its image in `public/features/`, and gate its route; to add a category: add it to `ONEAPP_CATEGORIES` and the `OneAppCategoryKey` union.
```

- [ ] **Step 3: Full check**

Run: `npx vitest run && npx tsc --noEmit -p . && npm run lint`
Expected: all tests pass, no type or lint errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/OneApp/features.ts CLAUDE.md
git commit -m "Smart Recommendations: registry and docs describe the home page block and tracker"
```

---

### Task 15: Manual verification on the dev store

**Files:** none (verification only)

- [ ] **Step 1: Start the dev loop**

Run: `npm run dev`
Expected: the tunnel opens, `prisma migrate deploy` applies `20260913230000_recommendation_shopper_signals` (this hits the database in `DATABASE_URL`; see the warning at the top), the theme extension is served to the dev store.

- [ ] **Step 2: Admin**

In the app open Smart Recommendations. Confirm the setup card shows two buttons; click each and confirm the theme editor opens with the block added to the home page and the embed toggled on. Create three rules:

1. "Viewed vases" — When: shopper viewed a product from a collection (pick one); Show: related to what they viewed; heading "Because you looked at vases".
2. "Returning" — When: returning visitor; Show: recently viewed; heading "Pick up where you left off".
3. "Everyone" — When: every visitor; Show: newest products.

Confirm the list shows "Viewed a product from …", "Returning visitor", "Every visitor" in the When column and "Related to what they viewed", "Recently viewed products", "Newest products" in Show.

- [ ] **Step 3: Storefront, first visit**

Open the dev store home page in a fresh private window. Expected: the block shows the newest products under "You might also like" (rule 3; rules 1 and 2 are unusable with nothing viewed). Open the browser console and confirm `localStorage.getItem("q8-first-seen")` is today's date.

- [ ] **Step 4: Storefront, after viewing**

Open a product from the collection picked in rule 1, then go back to the home page. Expected: the block shows Shopify's related products under "Because you looked at vases" (rule 1). Confirm `localStorage.getItem("q8-viewed")` starts with that product's id and collections.

- [ ] **Step 5: Stacked rails**

In the theme editor add the block a second time with Rail = "2nd matching rule". Expected on the home page: the first block shows rule 1's rail; the second block shows rule 3's newest products (rule 2 is unusable until the visitor returns another day). Change the first-seen date in the console to yesterday (`localStorage.setItem("q8-first-seen","2000-01-01")`) and reload: the second block now shows rule 2's recently viewed rail, and no product appears in both blocks.

- [ ] **Step 6: Quick add and cart block**

Click Add to cart on a card. Expected: the button reads "Add to cart ✓" and the theme's cart count updates (or the cart drawer opens on themes that listen to `cart:refresh`). Open the cart page with the Delivery checkout block and go to the Options step. Expected: the occasion gift picks still show when an occasion is chosen; there is no separate recommendations rail.

- [ ] **Step 7: Deploy the extension**

Only after the above passes and the code is merged: `npm run deploy` from this checkout, then confirm with `shopify app versions list --client-id <production client id>` (see memory `function-deploy-workflow`). Extensions do not update otherwise.
