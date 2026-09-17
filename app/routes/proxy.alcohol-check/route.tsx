import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { getShopPlan } from "app/services/subscriptions/shopPlan.server";
import { parseProductIds } from "app/services/delivery/alcoholProducts";
import { EMPTY_ALCOHOL_CHECK, checkAlcoholProducts } from "app/services/delivery/alcoholProducts.server";

/**
 * App Proxy endpoint for the cart block's alcohol rules. Reached at
 * `/apps/quali8/alcohol-check?products=<id,id,…>` (numeric product ids).
 * Returns which of them are in the merchant's alcohol collections, so the
 * block knows whether to show the age card, force the zip check, and block
 * an alcohol-only cart. Anything wrong reads as "no alcohol": the checkout
 * validation function stays the hard gate.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  // Same answer for the same products — a short shared cache absorbs repeats.
  const headers = { "Cache-Control": "public, max-age=120" };

  if (!shop || !admin) {
    return Response.json(EMPTY_ALCOHOL_CHECK, { headers });
  }

  try {
    // Alcohol rules are part of the Advance cart block.
    if (!(await getShopPlan(shop, db)).hasShippingDiscounts) {
      return Response.json(EMPTY_ALCOHOL_CHECK, { headers });
    }
    const products = parseProductIds(url.searchParams.get("products"));
    return Response.json(await checkAlcoholProducts(db, admin.graphql, shop, products), { headers });
  } catch (error) {
    console.error("Error in /proxy/alcohol-check:", error); // eslint-disable-line no-console
    return Response.json(EMPTY_ALCOHOL_CHECK, { headers });
  }
};
