import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { shopHasRecommendations } from "app/services/recommendations/entitlement.server";
import { parseShopperParams } from "app/services/recommendations/shopperParams";
import {
  EMPTY_RESPONSE,
  recommendForShopper,
} from "app/services/recommendations/smartRecommendations.server";

/**
 * App Proxy endpoint for the Smart Recommendations home page block.
 *
 * Reached at `/apps/quali8/smart-recommendations?cart=<id,id>&total=<n>
 * &viewed=<id,id>&viewedCollections=<id,id>&returning=0|1&slot=<1-3>
 * &limit=<1-12>`. `cart`/`total` describe the live cart, `viewed*` come
 * from the tracker embed's localStorage, `slot` says which matching rule
 * this block instance shows. The merchant's rules decide what to show.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  // Same answer for the same signals — a short shared cache absorbs traffic.
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop || !admin) {
    return Response.json(EMPTY_RESPONSE, { headers });
  }

  try {
    if (!(await shopHasRecommendations(shop, db))) {
      return Response.json(EMPTY_RESPONSE, { headers });
    }

    const params = parseShopperParams(url.searchParams);
    const payload = await recommendForShopper(db, admin.graphql, {
      shop,
      cartProductIds: params.cartProductIds,
      cartTotal: params.cartTotal,
      viewedProductIds: params.viewedProductIds,
      viewedCollectionIds: params.viewedCollectionIds,
      returning: params.returning,
      slot: params.slot,
      maxProducts: params.limit,
    });

    return Response.json(payload, { headers });
  } catch (error) {
    console.error("Error in /proxy/smart-recommendations:", error); // eslint-disable-line no-console
    return Response.json(EMPTY_RESPONSE, { headers });
  }
};
