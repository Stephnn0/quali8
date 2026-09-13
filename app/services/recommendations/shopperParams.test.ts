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
