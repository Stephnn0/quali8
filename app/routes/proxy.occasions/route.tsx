import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { shopHasRecommendations } from "app/services/recommendations/entitlement.server";
import {
  disabledOccasionBlock,
  loadStorefrontOccasionBlock,
} from "app/services/occasions/occasionBlock.server";

/**
 * App Proxy endpoint for the Occasions + Gifts product-page block, reached
 * at `/apps/quali8/occasions`: the block's copy and behaviour (managed on
 * the Occasions page), the active occasions, and which to suggest first.
 * Gift picks come from /apps/quali8/recommendations?occasion=<slug>.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop) return Response.json(disabledOccasionBlock(), { headers });
  try {
    if (!(await shopHasRecommendations(shop, db))) return Response.json(disabledOccasionBlock(), { headers });
    return Response.json(await loadStorefrontOccasionBlock(db, shop), { headers });
  } catch (error) {
    console.error("Error in /proxy/occasions:", error); // eslint-disable-line no-console
    return Response.json(disabledOccasionBlock(), { headers });
  }
};
