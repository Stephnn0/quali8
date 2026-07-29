import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { shopHasAssistant } from "app/services/assistant/entitlement.server";

/**
 * App Proxy endpoint for the "Collection FAQs" theme block.
 * Reached at `/apps/quali8/faqs?collection_id=<numeric id>`. Returns the
 * collection's FAQ entries in display order, or `{ faqs: [] }`.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Validates the Shopify HMAC signature; throws a 4xx Response if invalid.
  const { session } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  const collectionId = url.searchParams.get("collection_id");

  // FAQs are per-collection, not per-shopper — shared cache is safe.
  const headers = { "Cache-Control": "public, max-age=60" };

  if (!shop || !collectionId || !/^\d+$/.test(collectionId)) {
    return Response.json({ faqs: [] }, { headers });
  }

  try {
    // Collection FAQs are an Advance-plan feature
    if (!(await shopHasAssistant(shop, db))) {
      return Response.json({ faqs: [] }, { headers });
    }

    const faqs = await db.collectionFaq.findMany({
      where: {
        shop,
        collectionId: `gid://shopify/Collection/${collectionId}`,
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { question: true, answer: true },
    });

    return Response.json({ faqs }, { headers });
  } catch (error) {
    console.error("Error in /proxy/faqs:", error); // eslint-disable-line no-console
    // Never surface an error to the storefront — just render nothing.
    return Response.json({ faqs: [] }, { headers });
  }
};
