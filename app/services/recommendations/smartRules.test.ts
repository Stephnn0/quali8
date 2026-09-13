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
