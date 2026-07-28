import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { selectEligibleOffers } from "app/services/storefront/freeShippingOffers.server";

/**
 * App Proxy endpoint for the storefront "shipping progress bar" theme block.
 *
 * Reached from the storefront at `/apps/quali8/free-shipping` (see the
 * `[app_proxy]` block in `shopify.app.toml`). Shopify validates and signs the
 * request, then forwards it here adding `shop` and `logged_in_customer_id`
 * query params. Returns the shipping reward offers the current shopper
 * qualifies for so the bar can show a personalised threshold.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Validates the Shopify HMAC signature; throws a 4xx Response if invalid.
  const { session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  const loggedInCustomerId = url.searchParams.get("logged_in_customer_id");

  // Per-customer data — never let the storefront/CDN cache one shopper's offers
  // for another.
  const headers = { "Cache-Control": "no-store" };

  if (!shop) {
    return Response.json({ offers: [] }, { headers });
  }

  try {
    const offers = await selectEligibleOffers(db, shop, loggedInCustomerId);
    return Response.json({ offers }, { headers });
  } catch (error) {
    console.error("Error in /proxy/free-shipping:", error); // eslint-disable-line no-console
    // Never surface an error to the storefront — just render nothing.
    return Response.json({ offers: [] }, { headers });
  }
};
