import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { getShopPlan } from "app/services/subscriptions/shopPlan.server";
import { signupLimitStatus } from "app/services/subscribe/subscribers.server";

const GRAPHQL_QUERY_MARKETING_STATE = `#graphql
  query popupCustomerMarketingState($id: ID!) {
    customer(id: $id) {
      emailMarketingConsent {
        marketingState
      }
    }
  }
`;

/**
 * App Proxy endpoint for the scheduled subscribe popup.
 * Reached at `/apps/quali8/popup`. Returns the active popup config, or
 * `{ popup: null }` — including for signed-in shoppers who are already
 * subscribed (anonymous repeat-visitors are suppressed client-side via
 * localStorage). With `?preview=1` (the theme editor) it returns the
 * shop-wide popup regardless of its dates or enabled flag, with the discount
 * code masked, so merchants can style the block without a live campaign.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  const customerId = url.searchParams.get("logged_in_customer_id");
  const preview = url.searchParams.get("preview") === "1";
  // Personalized when signed in — don't share-cache those responses
  const headers = {
    "Cache-Control": customerId || preview ? "no-store" : "public, max-age=60",
  };

  if (!shop) {
    return Response.json({ popup: null }, { headers });
  }

  try {
    if (preview) {
      const popup =
        (await db.subscribePopup.findFirst({
          where: { shop, specialDateId: null },
          select: { imageUrl: true, heading: true, description: true },
        })) ??
        (await db.subscribePopup.findFirst({
          where: { shop },
          orderBy: { updatedAt: "desc" },
          select: { imageUrl: true, heading: true, description: true },
        }));
      return Response.json(
        {
          popup: popup ? { ...popup, discountCode: "WELCOME10", preview: true } : null,
        },
        { headers },
      );
    }

    // The popup is a plan feature with a monthly signup cap on Free: once the
    // cap is used up the popup simply stops showing until next month.
    const plan = await getShopPlan(shop, db);
    if (!plan.hasSubscribePopup || (await signupLimitStatus(db, shop)).reached) {
      return Response.json({ popup: null }, { headers });
    }

    const today = new Date().toISOString().slice(0, 10);
    const popup = await db.subscribePopup.findFirst({
      where: {
        shop,
        enabled: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: { endDate: "asc" },
      select: {
        imageUrl: true,
        heading: true,
        description: true,
        discountCode: true,
      },
    });
    if (!popup) {
      return Response.json({ popup: null }, { headers });
    }

    // Signed-in shoppers who already subscribed never see the popup
    if (customerId && admin) {
      try {
        const response = await admin.graphql(GRAPHQL_QUERY_MARKETING_STATE, {
          variables: { id: `gid://shopify/Customer/${customerId}` },
        });
        const { data } = await response.json();
        const state = data?.customer?.emailMarketingConsent?.marketingState;
        if (state === "SUBSCRIBED") {
          return Response.json({ popup: null }, { headers });
        }
      } catch (error) {
        console.error("Popup consent check failed:", error);
      }
    }

    return Response.json(
      {
        popup: {
          imageUrl: popup.imageUrl,
          heading: popup.heading,
          description: popup.description,
          discountCode: popup.discountCode,
        },
      },
      { headers },
    );
  } catch (error) {
    console.error("Error in /proxy/popup:", error); // eslint-disable-line no-console
    return Response.json({ popup: null }, { headers });
  }
};
