import { describe, expect, it } from "vitest";
import {
  membershipQuery,
  numericId,
  parseProductIds,
  restrictedProductIds,
  toMemberships,
} from "./alcoholProducts";

describe("alcohol product membership", () => {
  it("keeps products that hit any collection", () => {
    expect(
      restrictedProductIds([
        { id: "gid://shopify/Product/1", flags: [false, true] },
        { id: "gid://shopify/Product/2", flags: [false] },
        null,
      ]),
    ).toEqual(["gid://shopify/Product/1"]);
  });

  it("parses the storefront's id list", () => {
    expect(parseProductIds("1, 2,x,1")).toEqual(["gid://shopify/Product/1", "gid://shopify/Product/2"]);
    expect(parseProductIds(null)).toEqual([]);
    expect(numericId("gid://shopify/Product/123")).toBe("123");
  });

  it("builds one aliased inCollection per collection", () => {
    const query = membershipQuery(2);
    expect(query).toContain("$c0: ID!, $c1: ID!");
    expect(query).toContain("c1: inCollection(id: $c1)");
    expect(query).toContain("nodes(ids: $ids)");
  });

  it("maps raw nodes to memberships in collection order", () => {
    expect(toMemberships([{ id: "gid://shopify/Product/1", c0: false, c1: true }, null, { c0: true }], 2)).toEqual([
      { id: "gid://shopify/Product/1", flags: [false, true] },
      null,
      null,
    ]);
  });
});
