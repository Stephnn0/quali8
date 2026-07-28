import type { PrismaClient } from "@prisma/client";
import { getActiveBundleForProduct } from "app/models/app.server/bundles/bundles.server";
import {
  applyPercentDiscount,
  computeBundlePricing,
  type BundlePricing,
} from "app/utils/bundlePricing";

/**
 * The JSON the storefront bundle theme block renders. Variant ids are NUMERIC
 * because the block feeds them straight into the Ajax Cart API
 * (`/cart/add.js`), which doesn't accept GIDs.
 *
 * Prices are the snapshots stored when the merchant last saved the bundle —
 * re-saving refreshes them, and the card is presentational. The price charged
 * at checkout is the live variant price minus the bundle percent, applied by
 * the bundle-discounts function (see
 * app/services/bundles/bundleDiscountSync.server.ts) to lines tagged with the
 * `_quali8_bundle` property while the complete bundle is in the cart.
 */
export type BundleOffer = {
  id: number;
  title: string;
  description: string | null;
  items: BundleOfferItem[];
  pricing: BundlePricing;
};

export type BundleOfferItem = {
  variantId: number;
  productTitle: string;
  variantTitle: string | null;
  quantity: number;
  /** Snapshot unit price, major currency unit. */
  price: number;
  /** Unit price with the bundle percent applied, major currency unit. */
  discountedPrice: number;
  imageUrl: string | null;
};

/** `gid://shopify/ProductVariant/456` → 456. Null when not a valid GID/id. */
export function parseNumericId(gidOrId: string): number | null {
  const match = gidOrId.trim().match(/(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Returns the active bundle offer for a product page, or null when there is
 * nothing to render. `numericProductId` comes from the theme block
 * (`{{ product.id }}`); we store product GIDs, so it's rebuilt here. A bundle
 * is served on every product page it contains.
 *
 * Pure data access + shaping — no Request/Response handling — so it can be
 * unit-tested in isolation.
 */
export async function getActiveBundleOffer(
  db: PrismaClient,
  shop: string,
  numericProductId: string | null,
): Promise<BundleOffer | null> {
  if (!numericProductId || !/^\d+$/.test(numericProductId.trim())) {
    return null;
  }

  const productGid = `gid://shopify/Product/${numericProductId.trim()}`;
  const bundle = await getActiveBundleForProduct(shop, productGid, db);

  if (!bundle || bundle.items.length === 0) return null;

  const items: BundleOfferItem[] = [];
  for (const item of bundle.items) {
    const variantId = parseNumericId(item.variantId);
    // A malformed variant id would make the cart add fail for the whole
    // bundle — drop the offer entirely rather than sell half a bundle.
    if (variantId === null) return null;

    items.push({
      variantId,
      productTitle: item.productTitle,
      variantTitle: item.variantTitle,
      quantity: item.quantity,
      price: item.price,
      discountedPrice: applyPercentDiscount(item.price, bundle.discountPercent),
      imageUrl: item.imageUrl,
    });
  }

  const pricing = computeBundlePricing(items, bundle.discountPercent);
  if (pricing.originalTotal <= 0) return null;

  return {
    id: bundle.id,
    title: bundle.title,
    description: bundle.description ?? null,
    items,
    pricing,
  };
}
