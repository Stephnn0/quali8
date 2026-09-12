import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

/**
 * App Proxy endpoint for the homepage announcement bar theme block.
 * Reached at `/apps/quali8/announcement`. Returns the scheduled bar whose
 * window contains today (the soonest-ending one when windows overlap), or
 * `{ bar: null }`. Advance-plan entitlement is implied by the bar's
 * existence — bars are only creatable from the gated manage page.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Validates the Shopify HMAC signature; throws a 4xx Response if invalid.
  const { session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");

  // Same bar for every visitor — a short shared cache absorbs traffic.
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop) {
    return Response.json({ bar: null }, { headers });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const bar = await db.announcementBar.findFirst({
      where: {
        shop,
        enabled: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: { endDate: "asc" },
      select: {
        message: true,
        backgroundColor: true,
        textColor: true,
        endDate: true, // lets the theme block show a countdown
      },
    });

    return Response.json({ bar }, { headers });
  } catch (error) {
    console.error("Error in /proxy/announcement:", error); // eslint-disable-line no-console
    // Never surface an error to the storefront — just render nothing.
    return Response.json({ bar: null }, { headers });
  }
};
