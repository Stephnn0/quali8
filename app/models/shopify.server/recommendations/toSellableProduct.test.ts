import { describe, expect, it } from "vitest";
import { toSellableProduct, type ProductNode } from "./index";

const node = (overrides: Partial<ProductNode>): ProductNode => ({
  id: "gid://shopify/Product/1",
  title: "Teddy Bear",
  status: "ACTIVE",
  onlineStoreUrl: "https://shop.example/products/teddy",
  publishedAt: "2026-01-01T00:00:00Z",
  variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/11", price: "8.00", availableForSale: true } }] },
  ...overrides,
});

describe("toSellableProduct", () => {
  it("accepts a published product on a password-protected store (no onlineStoreUrl)", () => {
    expect(toSellableProduct(node({ onlineStoreUrl: null }))?.variantId).toBe("gid://shopify/ProductVariant/11");
  });

  it("rejects unpublished, inactive, or sold-out products", () => {
    expect(toSellableProduct(node({ onlineStoreUrl: null, publishedAt: null }))).toBeNull();
    expect(toSellableProduct(node({ status: "DRAFT" }))).toBeNull();
    expect(toSellableProduct(node({ variants: { edges: [{ node: { id: "v", price: "1", availableForSale: false } }] } }))).toBeNull();
  });
});
