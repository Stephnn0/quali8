import type { Bundle, BundleItem } from "@prisma/client";

/**
 * Shapes the shop's active bundles into the JSON the bundle-discounts
 * function reads from its discount metafield.
 *
 * IMPORTANT: this is one half of a contract — the other half is
 * `extensions/bundle-discounts/src/types.ts` (`BundleDiscountConfig`). Keep
 * them in sync or the function silently produces no discounts.
 */

export type BundleWithItems = Bundle & { items: BundleItem[] };

export type BundleDiscountConfig = {
  bundles: Array<{
    id: number;
    title: string;
    discountPercent: number;
    items: Array<{ variantId: string; quantity: number }>;
  }>;
};

export function buildBundleDiscountConfig(
  bundles: BundleWithItems[],
): BundleDiscountConfig {
  return {
    bundles: bundles
      .filter((bundle) => bundle.items.length > 0)
      .map((bundle) => ({
        id: bundle.id,
        title: bundle.title,
        discountPercent: bundle.discountPercent,
        items: bundle.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      })),
  };
}
