import type { PrismaClient } from "@prisma/client";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  getCustomerPurchases,
  getProductsByQuery,
} from "app/models/shopify.server/recommendations";
import {
  BUDGET_BANDS,
  RECIPIENTS,
  TAG_PREFIX,
  occasionWindowContains,
  seasonForDate,
  type BudgetSlug,
  type RecipientSlug,
} from "./constants";
import {
  rankCandidates,
  type Candidate,
  type RecommendedProduct,
} from "./scoring";

export type RecommendationRequest = {
  shop: string;
  occasionSlug: string | null;
  recipient: RecipientSlug | null;
  budget: BudgetSlug | null;
  /** Products already on screen or in the cart — never recommended. */
  excludeProductIds: string[];
  /** Numeric id from the app proxy's logged_in_customer_id, if present. */
  customerId: string | null;
  limit?: number;
};

export type RecommendationResponse = {
  products: RecommendedProduct[];
  /** Picker data: the shop's active occasions, with the in-season default. */
  occasions: Array<{ slug: string; name: string; inSeason: boolean }>;
  recipients: Array<{ slug: string; label: string }>;
  budgets: Array<{ slug: string; label: string }>;
};

/**
 * The Smart Recommendations engine: curated occasion products + tag-matched
 * products from Shopify, personalized by past purchases when the shopper is
 * logged in, ranked by the pure scorer.
 */
export async function recommendProducts(
  db: PrismaClient,
  graphql: AdminGraphqlClient,
  request: RecommendationRequest,
  now: Date = new Date(),
): Promise<RecommendationResponse> {
  const occasions = await db.occasion.findMany({
    where: { shop: request.shop, status: "ACTIVE" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { products: { orderBy: { position: "asc" } } },
  });

  const selected =
    occasions.find((occasion) => occasion.slug === request.occasionSlug) ??
    // Default to the occasion whose window contains today, if any
    occasions.find((occasion) => occasionWindowContains(occasion, now)) ??
    null;

  // ---- Candidates ---------------------------------------------------------

  const candidates: Candidate[] = [];

  if (selected) {
    for (const product of selected.products) {
      candidates.push({
        productId: product.productId,
        variantId: product.variantId,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        handle: null,
        tags: [],
        productType: null,
        curatedForOccasion: true,
      });
    }
  }

  // Tag-based pool: occasion, recipient, and season tags in one query
  const tagTerms = [
    selected ? `tag:'${TAG_PREFIX.occasion}${selected.slug}'` : null,
    request.recipient
      ? `tag:'${TAG_PREFIX.recipient}${request.recipient}'`
      : null,
    `tag:'${TAG_PREFIX.season}${seasonForDate(now)}'`,
  ].filter(Boolean);

  try {
    const tagProducts = await getProductsByQuery(
      graphql,
      tagTerms.join(" OR "),
    );
    for (const product of tagProducts) {
      candidates.push({
        productId: product.id,
        variantId: product.variantId,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        handle: product.handle,
        tags: product.tags,
        productType: product.productType,
        curatedForOccasion: false,
      });
    }
  } catch (error) {
    // Tag pool is additive — curated products still work without it
    console.error("Tag candidate fetch failed:", error);
  }

  // ---- Personalization ----------------------------------------------------

  let purchasedProductIds: string[] = [];
  let purchasedProductTypes: string[] = [];
  if (request.customerId) {
    try {
      const purchases = await getCustomerPurchases(
        graphql,
        `gid://shopify/Customer/${request.customerId}`,
      );
      purchasedProductIds = purchases.productIds;
      purchasedProductTypes = purchases.productTypes;
    } catch (error) {
      console.error("Purchase history fetch failed:", error);
    }
  }

  // ---- Rank ---------------------------------------------------------------

  const products = rankCandidates(
    candidates,
    {
      occasionSlug: selected?.slug ?? null,
      occasionName: selected?.name ?? null,
      recipient: request.recipient,
      budget: request.budget,
      season: seasonForDate(now),
      excludeProductIds: request.excludeProductIds,
      purchasedProductTypes,
      purchasedProductIds,
    },
    request.limit ?? 4,
  );

  return {
    products,
    occasions: occasions.map((occasion) => ({
      slug: occasion.slug,
      name: occasion.name,
      inSeason: occasionWindowContains(occasion, now),
    })),
    recipients: RECIPIENTS.map(({ slug, label }) => ({ slug, label })),
    budgets: BUDGET_BANDS.map(({ slug, label }) => ({ slug, label })),
  };
}
