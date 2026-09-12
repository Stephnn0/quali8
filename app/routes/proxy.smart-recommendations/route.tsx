import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { shopHasRecommendations } from "app/services/recommendations/entitlement.server";
import { recommendForCart } from "app/services/recommendations/smartRecommendations.server";

/**
 * App Proxy endpoint for the Smart Recommendations cart block.
 *
 * Reached at `/apps/quali8/smart-recommendations?cart=<id,id>&total=<n>
 * &limit=<1-12>`. `cart` carries the numeric product ids in the cart and
 * `total` the subtotal in the shop currency; the merchant's rules decide
 * what to show.
 */

const EMPTY = { products: [], heading: null, ruleId: null, fallbackUsed: false };
const MAX_LIMIT = 12;

const asLimit = (value: string | null): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) return 4;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
};

const asTotal = (value: string | null): number | null => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  // Same answer for the same cart contents — a short shared cache absorbs traffic.
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop || !admin) {
    return Response.json(EMPTY, { headers });
  }

  try {
    if (!(await shopHasRecommendations(shop, db))) {
      return Response.json(EMPTY, { headers });
    }

    const cartProductIds = (url.searchParams.get("cart") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^\d+$/.test(id))
      .map((id) => `gid://shopify/Product/${id}`);

    const payload = await recommendForCart(db, admin.graphql, {
      shop,
      cartProductIds,
      cartTotal: asTotal(url.searchParams.get("total")),
      maxProducts: asLimit(url.searchParams.get("limit")),
    });

    return Response.json(payload, { headers });
  } catch (error) {
    console.error("Error in /proxy/smart-recommendations:", error); // eslint-disable-line no-console
    return Response.json(EMPTY, { headers });
  }
};
