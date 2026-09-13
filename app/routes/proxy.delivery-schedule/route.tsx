import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { loadDeliverySchedule } from "app/services/delivery/deliverySchedule.server";
import { defaultDeliverySchedule } from "app/services/delivery/deliverySchedule";

/**
 * App Proxy endpoint for the cart calendar. Reached at
 * `/apps/quali8/delivery-schedule`. Returns the shop's blocked weekdays and
 * dates, lead time and booking window for delivery and pickup. The cart
 * block evaluates the rules against the shopper's local date.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  // Same rules for every visitor — a short shared cache absorbs repeats.
  const headers = { "Cache-Control": "public, max-age=300" };

  if (!shop) return Response.json(defaultDeliverySchedule(), { headers });
  try {
    return Response.json(await loadDeliverySchedule(db, shop), { headers });
  } catch (error) {
    console.error("Error in /proxy/delivery-schedule:", error); // eslint-disable-line no-console
    return Response.json(defaultDeliverySchedule(), { headers });
  }
};
