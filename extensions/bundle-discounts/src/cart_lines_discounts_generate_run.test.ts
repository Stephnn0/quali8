import { describe, it, expect } from "vitest";

import { cartLinesDiscountsGenerateRun } from "./cart_lines_discounts_generate_run";
import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
  type CartLinesInput,
} from "../generated/api";
import type { BundleDiscountConfig } from "./types";

const VARIANT_A = "gid://shopify/ProductVariant/111";
const VARIANT_B = "gid://shopify/ProductVariant/222";
const VARIANT_C = "gid://shopify/ProductVariant/333";

type Line = CartLinesInput["cart"]["lines"][number];

function line(
  id: string,
  variantId: string,
  quantity: number,
  bundleId?: string,
): Line {
  return {
    id,
    quantity,
    bundleAttribute: bundleId == null ? null : { value: bundleId },
    merchandise: { __typename: "ProductVariant", id: variantId },
  };
}

function buildInput(
  lines: Line[],
  config: BundleDiscountConfig | null,
  discountClasses: DiscountClass[] = [DiscountClass.Product],
): CartLinesInput {
  return {
    cart: { lines },
    discount: {
      discountClasses,
      metafield: config == null ? null : { jsonValue: config },
    },
  };
}

const KIT_CONFIG: BundleDiscountConfig = {
  bundles: [
    {
      id: 7,
      title: "Camera kit",
      discountPercent: 15,
      items: [
        { variantId: VARIANT_A, quantity: 1 },
        { variantId: VARIANT_B, quantity: 2 },
      ],
    },
  ],
};

describe("cartLinesDiscountsGenerateRun", () => {
  it("discounts every line of a complete bundle", () => {
    const input = buildInput(
      [
        line("gid://shopify/CartLine/1", VARIANT_A, 1, "7"),
        line("gid://shopify/CartLine/2", VARIANT_B, 2, "7"),
      ],
      KIT_CONFIG,
    );

    const result = cartLinesDiscountsGenerateRun(input);

    expect(result.operations).toHaveLength(1);
    const operation = result.operations[0];
    if (!("productDiscountsAdd" in operation) || !operation.productDiscountsAdd) {
      throw new Error("expected a productDiscountsAdd operation");
    }
    expect(operation.productDiscountsAdd.selectionStrategy).toBe(
      ProductDiscountSelectionStrategy.All,
    );
    expect(operation.productDiscountsAdd.candidates).toEqual([
      {
        message: "Camera kit",
        targets: [
          { cartLine: { id: "gid://shopify/CartLine/1" } },
          { cartLine: { id: "gid://shopify/CartLine/2" } },
        ],
        value: { percentage: { value: 15 } },
      },
    ]);
  });

  it("does nothing when a bundle item is missing from the cart", () => {
    const input = buildInput(
      [line("gid://shopify/CartLine/1", VARIANT_A, 1, "7")],
      KIT_CONFIG,
    );

    expect(cartLinesDiscountsGenerateRun(input).operations).toHaveLength(0);
  });

  it("does nothing when a bundle item's quantity is short", () => {
    const input = buildInput(
      [
        line("gid://shopify/CartLine/1", VARIANT_A, 1, "7"),
        line("gid://shopify/CartLine/2", VARIANT_B, 1, "7"), // needs 2
      ],
      KIT_CONFIG,
    );

    expect(cartLinesDiscountsGenerateRun(input).operations).toHaveLength(0);
  });

  it("qualifies when quantities exceed the requirement", () => {
    const input = buildInput(
      [
        line("gid://shopify/CartLine/1", VARIANT_A, 3, "7"),
        line("gid://shopify/CartLine/2", VARIANT_B, 4, "7"),
      ],
      KIT_CONFIG,
    );

    expect(cartLinesDiscountsGenerateRun(input).operations).toHaveLength(1);
  });

  it("ignores lines whose variant is not part of the claimed bundle", () => {
    const input = buildInput(
      [
        line("gid://shopify/CartLine/1", VARIANT_A, 1, "7"),
        line("gid://shopify/CartLine/2", VARIANT_B, 2, "7"),
        // Shopper manually stamped the property on an unrelated product.
        line("gid://shopify/CartLine/3", VARIANT_C, 1, "7"),
      ],
      KIT_CONFIG,
    );

    const result = cartLinesDiscountsGenerateRun(input);
    const operation = result.operations[0];
    if (!("productDiscountsAdd" in operation) || !operation.productDiscountsAdd) {
      throw new Error("expected a productDiscountsAdd operation");
    }
    const targets = operation.productDiscountsAdd.candidates[0].targets;
    expect(targets).toHaveLength(2);
    expect(targets).not.toContainEqual({
      cartLine: { id: "gid://shopify/CartLine/3" },
    });
  });

  it("ignores lines without the bundle property and unknown bundle ids", () => {
    const input = buildInput(
      [
        line("gid://shopify/CartLine/1", VARIANT_A, 1),
        line("gid://shopify/CartLine/2", VARIANT_B, 2, "999"),
      ],
      KIT_CONFIG,
    );

    expect(cartLinesDiscountsGenerateRun(input).operations).toHaveLength(0);
  });

  it("emits one candidate per complete bundle", () => {
    const config: BundleDiscountConfig = {
      bundles: [
        ...KIT_CONFIG.bundles,
        {
          id: 8,
          title: "Duo",
          discountPercent: 10,
          items: [{ variantId: VARIANT_C, quantity: 1 }],
        },
      ],
    };
    const input = buildInput(
      [
        line("gid://shopify/CartLine/1", VARIANT_A, 1, "7"),
        line("gid://shopify/CartLine/2", VARIANT_B, 2, "7"),
        line("gid://shopify/CartLine/3", VARIANT_C, 1, "8"),
      ],
      config,
    );

    const result = cartLinesDiscountsGenerateRun(input);
    const operation = result.operations[0];
    if (!("productDiscountsAdd" in operation) || !operation.productDiscountsAdd) {
      throw new Error("expected a productDiscountsAdd operation");
    }
    expect(operation.productDiscountsAdd.candidates).toHaveLength(2);
  });

  it("does nothing without the PRODUCT discount class", () => {
    const input = buildInput(
      [
        line("gid://shopify/CartLine/1", VARIANT_A, 1, "7"),
        line("gid://shopify/CartLine/2", VARIANT_B, 2, "7"),
      ],
      KIT_CONFIG,
      [DiscountClass.Shipping],
    );

    expect(cartLinesDiscountsGenerateRun(input).operations).toHaveLength(0);
  });

  it("does nothing when the metafield is missing or malformed", () => {
    const lines = [
      line("gid://shopify/CartLine/1", VARIANT_A, 1, "7"),
      line("gid://shopify/CartLine/2", VARIANT_B, 2, "7"),
    ];

    expect(
      cartLinesDiscountsGenerateRun(buildInput(lines, null)).operations,
    ).toHaveLength(0);
    expect(
      cartLinesDiscountsGenerateRun(
        buildInput(lines, { nope: true } as unknown as BundleDiscountConfig),
      ).operations,
    ).toHaveLength(0);
  });

  it("clamps out-of-range percentages and skips zero-percent bundles", () => {
    const config: BundleDiscountConfig = {
      bundles: [
        {
          id: 7,
          title: "Overshoot",
          discountPercent: 250,
          items: [{ variantId: VARIANT_A, quantity: 1 }],
        },
        {
          id: 8,
          title: "Nothing off",
          discountPercent: 0,
          items: [{ variantId: VARIANT_B, quantity: 1 }],
        },
      ],
    };
    const input = buildInput(
      [
        line("gid://shopify/CartLine/1", VARIANT_A, 1, "7"),
        line("gid://shopify/CartLine/2", VARIANT_B, 1, "8"),
      ],
      config,
    );

    const result = cartLinesDiscountsGenerateRun(input);
    const operation = result.operations[0];
    if (!("productDiscountsAdd" in operation) || !operation.productDiscountsAdd) {
      throw new Error("expected a productDiscountsAdd operation");
    }
    expect(operation.productDiscountsAdd.candidates).toEqual([
      {
        message: "Overshoot",
        targets: [{ cartLine: { id: "gid://shopify/CartLine/1" } }],
        value: { percentage: { value: 100 } },
      },
    ]);
  });
});
