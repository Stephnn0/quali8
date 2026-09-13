/**
 * Parses the Smart Recommendations proxy query string into typed shopper
 * signals. The home page block sends numeric ids; the app works in GIDs.
 */

export type ShopperParams = {
  cartProductIds: string[];
  cartTotal: number | null;
  viewedProductIds: string[];
  viewedCollectionIds: string[];
  returning: boolean;
  /** Which matching rule this block instance shows: 1, 2 or 3. */
  slot: number;
  /** Hard cap on products from the block: 1–12. */
  limit: number;
};

export const MAX_SLOT = 3;
export const MAX_LIMIT = 12;
const MAX_VIEWED_PRODUCTS = 12;
const MAX_VIEWED_COLLECTIONS = 24;

const gids = (value: string | null, kind: "Product" | "Collection", max: number): string[] =>
  (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))
    .slice(0, max)
    .map((id) => `gid://shopify/${kind}/${id}`);

const clampInt = (value: string | null, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export function parseShopperParams(params: URLSearchParams): ShopperParams {
  const total = Number.parseFloat(params.get("total") ?? "");
  return {
    cartProductIds: gids(params.get("cart"), "Product", 200),
    cartTotal: Number.isFinite(total) && total >= 0 ? total : null,
    viewedProductIds: gids(params.get("viewed"), "Product", MAX_VIEWED_PRODUCTS),
    viewedCollectionIds: gids(params.get("viewedCollections"), "Collection", MAX_VIEWED_COLLECTIONS),
    returning: params.get("returning") === "1",
    slot: clampInt(params.get("slot"), 1, 1, MAX_SLOT),
    limit: clampInt(params.get("limit"), 4, 1, MAX_LIMIT),
  };
}
