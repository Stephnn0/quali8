import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { shopHasRecommendations } from "app/services/recommendations/entitlement.server";
import { recommendProducts } from "app/services/recommendations/recommendProducts.server";
import {
  BUDGET_BANDS,
  RECIPIENTS,
  type BudgetSlug,
  type RecipientSlug,
} from "app/services/recommendations/constants";

/**
 * App Proxy endpoint for the storefront Smart Recommendations blocks.
 *
 * Reached at `/apps/quali8/recommendations?occasion=<slug>&recipient=<slug>
 * &budget=<slug>&exclude=<id,id>&limit=<1-12>&fallback=<0|1>` (see
 * [app_proxy] in shopify.app.toml). `fallback=0` disables the general pool
 * that tops up the list when nothing matches.
 * Shopify validates the signature and appends `shop` and, when the shopper
 * is signed in, `logged_in_customer_id` — which powers the past-purchases
 * signal.
 */

const EMPTY = {
  products: [],
  fallbackUsed: false,
  occasions: [],
  recipients: [],
  budgets: [],
};

const MAX_LIMIT = 12;

const asLimit = (value: string | null): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) return 4;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
};

const asRecipient = (value: string | null): RecipientSlug | null =>
  RECIPIENTS.some((recipient) => recipient.slug === value)
    ? (value as RecipientSlug)
    : null;

const asBudget = (value: string | null): BudgetSlug | null =>
  BUDGET_BANDS.some((band) => band.slug === value)
    ? (value as BudgetSlug)
    : null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Validates the Shopify HMAC signature; throws a 4xx Response if invalid.
  const { session, admin } = await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");
  const customerId = url.searchParams.get("logged_in_customer_id");

  // Anonymous requests are cacheable; personalized ones are not.
  const headers = {
    "Cache-Control": customerId ? "no-store" : "public, max-age=60",
  };

  if (!shop || !admin) {
    return Response.json(EMPTY, { headers });
  }

  try {
    // Smart Recommendations is an Advance-plan feature — render nothing otherwise.
    if (!(await shopHasRecommendations(shop, db))) {
      return Response.json(EMPTY, { headers });
    }

    // Storefront sends numeric product ids; the engine works in GIDs.
    const excludeProductIds = (url.searchParams.get("exclude") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^\d+$/.test(id))
      .map((id) => `gid://shopify/Product/${id}`);

    const payload = await recommendProducts(db, admin.graphql, {
      shop,
      occasionSlug: url.searchParams.get("occasion"),
      recipient: asRecipient(url.searchParams.get("recipient")),
      budget: asBudget(url.searchParams.get("budget")),
      excludeProductIds,
      customerId,
      limit: asLimit(url.searchParams.get("limit")),
      fallback: url.searchParams.get("fallback") !== "0",
    });

    return Response.json(payload, { headers });
  } catch (error) {
    console.error("Error in /proxy/recommendations:", error); // eslint-disable-line no-console
    // Never surface an error to the storefront — just render nothing.
    return Response.json(EMPTY, { headers });
  }
};
