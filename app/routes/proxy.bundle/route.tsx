import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { getActiveBundleOffer } from "app/services/storefront/bundleOffer.server";
import { shopHasBundles } from "app/services/bundles/bundleEntitlement.server";

/**
 * App Proxy endpoint for the storefront "Frequently Bought Together" theme
 * block.
 *
 * Reached from the storefront at `/apps/quali8/bundle?product_id=<id>` (see
 * the `[app_proxy]` block in `shopify.app.toml`). Shopify validates and signs
 * the request, then forwards it here adding the `shop` query param. Returns
 * the active bundle for the given product, or `{ bundle: null }`.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Validates the Shopify HMAC signature; throws a 4xx Response if invalid.
  const { session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  const productId = url.searchParams.get("product_id");

  // Bundles are per-product, not per-shopper, so a short shared cache is safe
  // and absorbs traffic spikes on popular product pages.
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop) {
    return Response.json({ bundle: null }, { headers });
  }

  try {
    // Bundles are a Pro-plan feature — render nothing for other plans.
    if (!(await shopHasBundles(shop, db))) {
      return Response.json({ bundle: null }, { headers });
    }

    const bundle = await getActiveBundleOffer(db, shop, productId);
    return Response.json({ bundle }, { headers });
  } catch (error) {
    console.error("Error in /proxy/bundle:", error); // eslint-disable-line no-console
    // Never surface an error to the storefront — just render nothing.
    return Response.json({ bundle: null }, { headers });
  }
};
