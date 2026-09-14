import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import {
  recordPopupEvent,
  subscribeFromPopup,
} from "app/services/subscribe/subscribers.server";
import {
  normalizeEmail,
  normalizeFirstName,
  parseCustomerTags,
} from "app/services/subscribe/subscribeAnalytics";

const headers = { "Cache-Control": "no-store" };

const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

/**
 * App Proxy endpoint for the subscribe popup, reached at
 * `/apps/quali8/subscribe` (POST, JSON body):
 *
 * - `{ "event": "view" }` / `{ "event": "dismiss" }` bump today's counters.
 * - `{ "event": "subscribe", "email", "firstName"?, "tags"? }` saves the
 *   shopper as a Shopify customer with marketing consent and records the
 *   subscriber for the Subscribe Boost analytics.
 *
 * Shopify signs every proxy request, so only storefront traffic gets here.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  if (!shop) return json({ ok: false }, 400);

  let body: Record<string, unknown> = {};
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid-json" }, 400);
  }

  try {
    if (body.event === "view" || body.event === "dismiss") {
      await recordPopupEvent(db, shop, body.event);
      return json({ ok: true });
    }

    if (body.event === "subscribe") {
      const email = normalizeEmail(body.email);
      if (!email) return json({ ok: false, error: "invalid-email" }, 422);
      const result = await subscribeFromPopup({
        db,
        graphql: admin?.graphql ?? null,
        shop,
        email,
        firstName: normalizeFirstName(body.firstName),
        tags: parseCustomerTags(body.tags),
      });
      return json(result);
    }

    return json({ ok: false, error: "unknown-event" }, 400);
  } catch (error) {
    console.error("Error in /proxy/subscribe:", error); // eslint-disable-line no-console
    return json({ ok: false, savedInShopify: false, scopeMissing: false }, 500);
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.public.appProxy(request);
  return json({ ok: false, error: "method-not-allowed" }, 405);
};
