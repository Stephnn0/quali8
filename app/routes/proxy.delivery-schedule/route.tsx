import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import {
  emptyStorefrontSchedule,
  loadStorefrontSchedule,
} from "app/services/delivery/deliverySchedule.server";

/**
 * App Proxy endpoint for the cart calendar. Reached at
 * `/apps/quali8/delivery-schedule`. Returns the shop's blocked weekdays and
 * dates, lead time and booking window for delivery and pickup, the shop's
 * clock (zone, date, time) with whether same-day is still open, and the
 * timed delivery windows. The cart block evaluates the date rules against
 * the shop's date, re-deriving the clock from the zone so a cached answer
 * still closes same-day on time.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  // Same rules for every visitor — a short shared cache absorbs repeats.
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop) return Response.json(emptyStorefrontSchedule(), { headers });
  try {
    return Response.json(await loadStorefrontSchedule(db, shop), { headers });
  } catch (error) {
    console.error("Error in /proxy/delivery-schedule:", error); // eslint-disable-line no-console
    return Response.json(emptyStorefrontSchedule(), { headers });
  }
};
