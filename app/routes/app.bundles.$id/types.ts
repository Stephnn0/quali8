import type { getBundleByIdForShop } from "app/models/app.server/bundles/bundles.server";

export type BundleLoaderData = {
  /** Null when creating a new bundle (`/app/bundles/new`) or not found. */
  bundle: Awaited<ReturnType<typeof getBundleByIdForShop>>;
};

/**
 * Client-side form state: one line per picked product. The default variant's
 * id/price are captured at pick time so the storefront can add the product to
 * the cart; quantity is always 1 for classic bundles.
 */
export type BundleFormItemState = {
  variantId: string;
  productId: string;
  quantity: number;
  productTitle: string;
  variantTitle: string | null;
  price: number;
  imageUrl: string | null;
};

/** Minimal shape of what `shopify.resourcePicker({ type: "product" })` returns. */
export type PickedProduct = {
  id: string;
  title?: string | null;
  handle?: string | null;
  images?: Array<{ originalSrc?: string; src?: string }> | null;
  variants?: Array<{
    id?: string;
    title?: string | null;
    price?: string | null;
  }> | null;
};
