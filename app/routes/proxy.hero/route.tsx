import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

/**
 * App Proxy endpoint for the scheduled homepage hero block.
 * Reached at `/apps/quali8/hero`. Returns the enabled hero whose window
 * contains today (soonest-ending wins on overlap), or `{ hero: null }`.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop) {
    return Response.json({ hero: null }, { headers });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const hero = await db.scheduledHero.findFirst({
      where: {
        shop,
        enabled: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: { endDate: "asc" },
      select: {
        imageUrl: true,
        imageUrl2: true,
        imageUrl3: true,
        heading: true,
        description: true,
        buttonLabel: true,
        buttonUrl: true,
        heightPx: true,
        textColor: true,
        buttonBackground: true,
        buttonTextColor: true,
        overlayOpacity: true,
      },
    });

    return Response.json({ hero }, { headers });
  } catch (error) {
    console.error("Error in /proxy/hero:", error); // eslint-disable-line no-console
    return Response.json({ hero: null }, { headers });
  }
};
