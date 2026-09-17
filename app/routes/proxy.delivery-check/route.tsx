import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { checkDelivery } from "app/services/delivery/deliveryZones.server";
import { MAX_ZIP_LENGTH } from "app/services/delivery/deliveryZones";
import { getShopPlan } from "app/services/subscriptions/shopPlan.server";

/**
 * App Proxy endpoint for the bar's zip code checker.
 * Reached at `/apps/quali8/delivery-check?zip=<code>`. Returns whether the
 * shop delivers to the code and the matching zone's price and message.
 * `&zones=1` matches the zones even when the merchant's checker switch is
 * off (the cart block's alcohol local-only rule).
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  const zip = (url.searchParams.get("zip") ?? "").slice(0, MAX_ZIP_LENGTH * 2);
  const ignoreSwitch = url.searchParams.get("zones") === "1";
  // Same answer for the same code — a short shared cache absorbs repeats.
  const headers = { "Cache-Control": "public, max-age=300" };

  const empty = { enabled: false, zip: "", deliverable: false, zone: null };
  if (!shop || !zip.trim()) {
    return Response.json(empty, { headers });
  }

  try {
    if (!(await getShopPlan(shop, db)).hasDeliveryZones) {
      return Response.json(empty, { headers });
    }
    return Response.json(await checkDelivery(db, shop, zip, { ignoreSwitch }), { headers });
  } catch (error) {
    console.error("Error in /proxy/delivery-check:", error); // eslint-disable-line no-console
    return Response.json(empty, { headers });
  }
};
