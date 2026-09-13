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
