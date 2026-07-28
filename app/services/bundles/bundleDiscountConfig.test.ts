import { describe, expect, it } from "vitest";
import {
  buildBundleDiscountConfig,
  type BundleWithItems,
} from "./bundleDiscountConfig";

function bundle(overrides: Partial<BundleWithItems> = {}): BundleWithItems {
  return {
    id: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    type: "CLASSIC",
    title: "Camera kit",
    description: null,
    status: "ACTIVE",
    discountPercent: 15,
    shop: "test.myshopify.com",
    items: [
      {
        id: 10,
        variantId: "gid://shopify/ProductVariant/111",
        productId: "gid://shopify/Product/1",
        quantity: 1,
        position: 0,
        productTitle: "Camera",
        variantTitle: null,
        price: 100,
        imageUrl: null,
        bundleId: 1,
      },
      {
        id: 11,
        variantId: "gid://shopify/ProductVariant/222",
        productId: "gid://shopify/Product/2",
        quantity: 2,
        position: 1,
        productTitle: "Lens",
        variantTitle: "50mm",
        price: 50,
        imageUrl: null,
        bundleId: 1,
      },
    ],
    ...overrides,
  };
}

describe("buildBundleDiscountConfig", () => {
  it("keeps only what the function contract needs", () => {
    expect(buildBundleDiscountConfig([bundle()])).toEqual({
      bundles: [
        {
          id: 1,
          title: "Camera kit",
          discountPercent: 15,
          items: [
            { variantId: "gid://shopify/ProductVariant/111", quantity: 1 },
            { variantId: "gid://shopify/ProductVariant/222", quantity: 2 },
          ],
        },
      ],
    });
  });

  it("drops bundles without items", () => {
    expect(
      buildBundleDiscountConfig([bundle({ id: 2, items: [] })]).bundles,
    ).toHaveLength(0);
  });

  it("returns an empty list for no bundles", () => {
    expect(buildBundleDiscountConfig([])).toEqual({ bundles: [] });
  });
});
