import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("app/models/app.server/bundles/bundles.server", () => ({
  getActiveBundleForProduct: vi.fn(),
}));

import { getActiveBundleOffer, parseNumericId } from "./bundleOffer.server";
import { getActiveBundleForProduct } from "app/models/app.server/bundles/bundles.server";

const getBundle = vi.mocked(getActiveBundleForProduct);

const db = {} as never;

function bundle(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Frequently bought together",
    description: "Buy these products together and get a discount!",
    discountPercent: 20,
    items: [
      {
        variantId: "gid://shopify/ProductVariant/111",
        productId: "gid://shopify/Product/42",
        productTitle: "Snowboard",
        variantTitle: "Default",
        quantity: 1,
        price: 30,
        imageUrl: "https://cdn.shopify.com/snowboard.jpg",
      },
      {
        variantId: "gid://shopify/ProductVariant/222",
        productId: "gid://shopify/Product/43",
        productTitle: "Wax",
        variantTitle: null,
        quantity: 2,
        price: 10,
        imageUrl: null,
      },
    ],
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseNumericId", () => {
  it("extracts the trailing numeric id from a GID or plain id", () => {
    expect(parseNumericId("gid://shopify/ProductVariant/456")).toBe(456);
    expect(parseNumericId("789")).toBe(789);
  });

  it("returns null for malformed values", () => {
    expect(parseNumericId("gid://shopify/ProductVariant/")).toBeNull();
    expect(parseNumericId("not-an-id")).toBeNull();
    expect(parseNumericId("")).toBeNull();
  });
});

describe("getActiveBundleOffer", () => {
  it("shapes the bundle into a storefront offer with numeric ids and percent pricing", async () => {
    getBundle.mockResolvedValue(bundle());

    const offer = await getActiveBundleOffer(db, "shop.myshopify.com", "42");

    expect(getBundle).toHaveBeenCalledWith(
      "shop.myshopify.com",
      "gid://shopify/Product/42",
      db,
    );
    expect(offer).toEqual({
      id: 1,
      title: "Frequently bought together",
      description: "Buy these products together and get a discount!",
      items: [
        {
          variantId: 111,
          productTitle: "Snowboard",
          variantTitle: "Default",
          quantity: 1,
          price: 30,
          discountedPrice: 24,
          imageUrl: "https://cdn.shopify.com/snowboard.jpg",
        },
        {
          variantId: 222,
          productTitle: "Wax",
          variantTitle: null,
          quantity: 2,
          price: 10,
          discountedPrice: 8,
          imageUrl: null,
        },
      ],
      pricing: {
        originalTotal: 50,
        discountPercent: 20,
        discountAmount: 10,
        finalTotal: 40,
        savingsPercent: 20,
      },
    });
  });

  it("rejects a missing or non-numeric product id without touching the db", async () => {
    expect(await getActiveBundleOffer(db, "shop.myshopify.com", null)).toBeNull();
    expect(
      await getActiveBundleOffer(db, "shop.myshopify.com", "abc"),
    ).toBeNull();
    expect(
      await getActiveBundleOffer(db, "shop.myshopify.com", "1; DROP TABLE"),
    ).toBeNull();
    expect(getBundle).not.toHaveBeenCalled();
  });

  it("returns null when there is no active bundle or it has no items", async () => {
    getBundle.mockResolvedValue(null as never);
    expect(await getActiveBundleOffer(db, "shop.myshopify.com", "42")).toBeNull();

    getBundle.mockResolvedValue(bundle({ items: [] }));
    expect(await getActiveBundleOffer(db, "shop.myshopify.com", "42")).toBeNull();
  });

  it("drops the whole offer when any variant id is malformed", async () => {
    getBundle.mockResolvedValue(
      bundle({
        items: [
          {
            variantId: "gid://shopify/ProductVariant/broken/",
            productId: "gid://shopify/Product/42",
            productTitle: "Snowboard",
            variantTitle: null,
            quantity: 1,
            price: 30,
            imageUrl: null,
          },
        ],
      }),
    );

    expect(await getActiveBundleOffer(db, "shop.myshopify.com", "42")).toBeNull();
  });

  it("returns null when the snapshot total is zero (nothing sensible to render)", async () => {
    getBundle.mockResolvedValue(
      bundle({
        items: [
          {
            variantId: "gid://shopify/ProductVariant/111",
            productId: "gid://shopify/Product/42",
            productTitle: "Freebie",
            variantTitle: null,
            quantity: 1,
            price: 0,
            imageUrl: null,
          },
        ],
      }),
    );

    expect(await getActiveBundleOffer(db, "shop.myshopify.com", "42")).toBeNull();
  });

  it("passes a null description through", async () => {
    getBundle.mockResolvedValue(bundle({ description: null }));

    const offer = await getActiveBundleOffer(db, "shop.myshopify.com", "42");
    expect(offer?.description).toBeNull();
  });
});
