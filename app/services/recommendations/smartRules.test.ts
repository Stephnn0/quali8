import { describe, expect, it } from "vitest";
import {
  needsCollections,
  pickRule,
  ruleMatches,
  withinPrice,
  type CartFacts,
  type RuleLike,
} from "./smartRules";

const rule = (overrides: Partial<RuleLike> = {}): RuleLike => ({
  position: 0,
  trigger: "ALWAYS",
  triggerCollectionId: null,
  triggerProductId: null,
  triggerMinTotal: null,
  ...overrides,
});

const cart = (overrides: Partial<CartFacts> = {}): CartFacts => ({
  productIds: [],
  collectionIds: [],
  total: null,
  ...overrides,
});

describe("ruleMatches", () => {
  it("ALWAYS matches any cart", () => {
    expect(ruleMatches(rule(), cart())).toBe(true);
  });

  it("CART_HAS_COLLECTION needs the collection in the cart", () => {
    const r = rule({
      trigger: "CART_HAS_COLLECTION",
      triggerCollectionId: "gid://shopify/Collection/1",
    });
    expect(ruleMatches(r, cart({ collectionIds: ["gid://shopify/Collection/1"] }))).toBe(true);
    expect(ruleMatches(r, cart({ collectionIds: ["gid://shopify/Collection/2"] }))).toBe(false);
    expect(ruleMatches(rule({ trigger: "CART_HAS_COLLECTION" }), cart())).toBe(false);
  });

  it("CART_HAS_PRODUCT needs the product in the cart", () => {
    const r = rule({
      trigger: "CART_HAS_PRODUCT",
      triggerProductId: "gid://shopify/Product/9",
    });
    expect(ruleMatches(r, cart({ productIds: ["gid://shopify/Product/9"] }))).toBe(true);
    expect(ruleMatches(r, cart({ productIds: ["gid://shopify/Product/8"] }))).toBe(false);
  });

  it("CART_TOTAL_MIN compares the subtotal and ignores unknown totals", () => {
    const r = rule({ trigger: "CART_TOTAL_MIN", triggerMinTotal: 50 });
    expect(ruleMatches(r, cart({ total: 50 }))).toBe(true);
    expect(ruleMatches(r, cart({ total: 49.99 }))).toBe(false);
    expect(ruleMatches(r, cart({ total: null }))).toBe(false);
  });
});

describe("pickRule", () => {
  it("returns the first matching rule by position, not array order", () => {
    const rules = [
      { ...rule({ position: 2 }), name: "fallback" },
      {
        ...rule({
          position: 1,
          trigger: "CART_TOTAL_MIN",
          triggerMinTotal: 100,
        }),
        name: "big carts",
      },
    ];
    expect(pickRule(rules, cart({ total: 150 }))?.name).toBe("big carts");
    expect(pickRule(rules, cart({ total: 20 }))?.name).toBe("fallback");
  });

  it("returns null when nothing matches", () => {
    const rules = [rule({ trigger: "CART_TOTAL_MIN", triggerMinTotal: 100 })];
    expect(pickRule(rules, cart({ total: 10 }))).toBeNull();
  });
});

describe("helpers", () => {
  it("needsCollections only for collection triggers", () => {
    expect(needsCollections([rule()])).toBe(false);
    expect(needsCollections([rule(), rule({ trigger: "CART_HAS_COLLECTION" })])).toBe(true);
  });

  it("withinPrice treats null bounds as open", () => {
    expect(withinPrice(30, null, null)).toBe(true);
    expect(withinPrice(30, 40, null)).toBe(false);
    expect(withinPrice(30, null, 20)).toBe(false);
    expect(withinPrice(30, 20, 40)).toBe(true);
  });
});
