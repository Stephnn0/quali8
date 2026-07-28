import type { AssistantBrief } from "./briefSchema";
import { upcomingCoreDates } from "./coreDates";
import { nicheLabel } from "./taxonomy";

/**
 * Curated briefs used when Gemini is unavailable (no key, timeout, invalid
 * output). Built on the deterministic core dates so they stay accurate;
 * only the copy is static. Client-safe.
 */

const FLORIST_ACTIONS: Record<string, string> = {
  "Valentine's Day": "Feature bouquets and pre-orders on your homepage now",
  "Mother's Day": "Curate a Mother's Day collection and open pre-orders",
  "International Women's Day": "Promote small arrangements for coworkers and friends",
  Easter: "Stock pastel arrangements and table centerpieces",
  Christmas: "Offer wreaths, centerpieces, and delivery cut-off messaging",
  "Black Friday": "Bundle vases or add-ons instead of discounting stems",
};

const GENERIC_ACTIONS: Record<string, string> = {
  "Valentine's Day": "Build a gift guide and highlight bestsellers",
  "Mother's Day": "Create a gifts-for-mom collection with clear delivery dates",
  Easter: "Refresh your homepage with seasonal picks",
  "Black Friday": "Plan your offer now: bundles beat blanket discounts",
  "Cyber Monday": "Prepare an online-only offer with a clear end time",
  Christmas: "Publish shipping deadlines and gift wrap options early",
  Thanksgiving: "Warm up your audience before the sales weekend",
  Halloween: "Theme your storefront and test a limited-time offer",
};

export function buildFallbackBrief(
  niche: string,
  country: string | null,
  now: Date = new Date(),
): AssistantBrief {
  const isFlorist = niche === "flowers-gifting";
  const actions = isFlorist ? FLORIST_ACTIONS : GENERIC_ACTIONS;
  const label = nicheLabel(niche).toLowerCase();

  const occasions = upcomingCoreDates(now, country ?? "US", 90)
    .slice(0, 6)
    .map((core) => ({
      name: core.name,
      date: core.date,
      whyItMatters: isFlorist
        ? `${core.name} is a key gifting moment for flower shops.`
        : `${core.name} drives seasonal shopping across ${label} stores.`,
      suggestedAction:
        actions[core.name] ?? "Plan a themed collection and a targeted offer",
    }));

  return {
    insight: isFlorist
      ? "Flower shops win occasions with preparation: pre-orders, delivery clarity, and ready-made collections for each date. Start with the nearest occasion below and work down the checklist."
      : `Occasion readiness is the fastest lever for ${label} stores: a themed collection, a clear offer, and delivery clarity before each date. Start with the nearest occasion below.`,
    occasions,
    checklist: [
      {
        id: "create-audience",
        title: "Create your first audience",
        description:
          "Group your repeat and high-spend customers so offers reach the people most likely to buy again.",
        category: "app",
      },
      {
        id: "curate-occasion",
        title: "Curate products for the next occasion",
        description:
          "Pick the products you want recommended for the nearest date in Occasions.",
        category: "app",
      },
      {
        id: "shipping-promo",
        title: "Plan a shipping promotion",
        description:
          "Free or discounted shipping close to the occasion is the highest-converting nudge at checkout.",
        category: "app",
      },
      {
        id: "homepage-refresh",
        title: "Refresh your homepage for the season",
        description:
          "Lead with the upcoming occasion: hero image, featured collection, and a clear order-by date.",
        category: "store",
      },
      {
        id: "delivery-cutoffs",
        title: "Publish delivery cut-off dates",
        description:
          "Tell shoppers the last day to order for on-time delivery — it reduces support tickets and abandoned carts.",
        category: "store",
      },
      {
        id: "stock-check",
        title: "Check inventory for bestsellers",
        description:
          "Review stock on your top products so the occasion doesn't sell you out early.",
        category: "inventory",
      },
    ],
  };
}
