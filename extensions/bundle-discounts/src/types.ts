/**
 * The JSON contract stored in the discount metafield
 * (`quali8_bundle_discounts`, type `json`).
 *
 * IMPORTANT: the app writes this shape in
 * `app/services/bundles/bundleDiscountConfig.ts` (buildBundleDiscountConfig).
 * The two must stay in sync or the function silently produces no discounts.
 */
export type BundleDiscountConfig = {
  bundles: BundleDiscountConfigBundle[];
};

export type BundleDiscountConfigBundle = {
  /** `Bundle.id` from the app DB — matches the `_quali8_bundle` line property. */
  id: number;
  /** Shown to the buyer as the discount message at checkout. */
  title: string;
  /** Percent off each bundle line (0–100). */
  discountPercent: number;
  items: BundleDiscountConfigItem[];
};

export type BundleDiscountConfigItem = {
  /** Shopify GID, e.g. `gid://shopify/ProductVariant/456`. */
  variantId: string;
  /** Minimum quantity of this variant required for the bundle to qualify. */
  quantity: number;
};
