import type { PrismaClient } from "@prisma/client";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  getCustomerPurchases,
  getProductsByIds,
  getProductsByQuery,
  getRecentProducts,
  type SellableProduct,
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
  /**
   * Top up with general picks (recently updated sellable products) when the
   * occasion/tag pool comes up short. Default true — occasions are optional.
   */
  fallback?: boolean;
};

export type RecommendationResponse = {
  products: RecommendedProduct[];
  /** True when some products came from the general pool, not a match. */
  fallbackUsed: boolean;
  /** Picker data: the shop's active occasions, with the in-season default. */
  occasions: Array<{ slug: string; name: string; inSeason: boolean }>;
  recipients: Array<{ slug: string; label: string }>;
  budgets: Array<{ slug: string; label: string }>;
};

/**
 * The Smart Recommendations engine: curated occasion products + tag-matched
 * products from Shopify, personalized by past purchases when the shopper is
 * logged in, ranked by the pure scorer. Occasions are optional: with no
 * match (or no occasions at all) the list is topped up from a general pool
 * so the storefront block always has something to show.
 */

const toCandidate = (product: SellableProduct): Candidate => ({
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

/** Fisher–Yates, so the general pool varies between visits. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
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
  // Every candidate must be sellable on the Online Store (active, published,
  // with an in-stock variant) or the storefront cart rejects it with
  // "Cannot find variant or is already sold out".

  const candidates: Candidate[] = [];

  if (selected && selected.products.length > 0) {
    try {
      // Verify curated snapshots against live product state: prices drift,
      // variants get replaced, products get unpublished or sell out.
      const live = await getProductsByIds(
        graphql,
        selected.products.map((product) => product.productId),
      );
      for (const snapshot of selected.products) {
        const product = live.get(snapshot.productId);
        if (!product) continue; // no longer sellable — never recommend it
        candidates.push({
          productId: product.id,
          variantId: product.variantId,
          title: product.title,
          price: product.price,
          imageUrl: product.imageUrl ?? snapshot.imageUrl,
          handle: product.handle,
          tags: product.tags,
          productType: product.productType,
          curatedForOccasion: true,
        });
      }
    } catch (error) {
      console.error("Curated product verification failed:", error);
      // Degrade to the stored snapshots rather than recommending nothing
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
      `(${tagTerms.join(" OR ")}) status:active`,
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

  const limit = request.limit ?? 4;
  const context = {
    occasionSlug: selected?.slug ?? null,
    occasionName: selected?.name ?? null,
    recipient: request.recipient,
    budget: request.budget,
    season: seasonForDate(now),
    excludeProductIds: request.excludeProductIds,
    purchasedProductTypes,
    purchasedProductIds,
  };

  const products = rankCandidates(candidates, context, limit);

  // ---- Fallback: general picks --------------------------------------------

  let fallbackUsed = false;
  if (request.fallback !== false && products.length < limit) {
    try {
      const chosen = new Set(products.map((product) => product.productId));
      const pool = shuffle(await getRecentProducts(graphql, 40))
        .filter((product) => !chosen.has(product.id))
        .map(toCandidate);
      const extra = rankCandidates(pool, context, limit - products.length);
      if (extra.length > 0) {
        fallbackUsed = true;
        products.push(...extra);
      }
    } catch (error) {
      console.error("General recommendation pool fetch failed:", error);
    }
  }

  return {
    products,
    fallbackUsed,
    occasions: occasions.map((occasion) => ({
      slug: occasion.slug,
      name: occasion.name,
      inSeason: occasionWindowContains(occasion, now),
    })),
    recipients: RECIPIENTS.map(({ slug, label }) => ({ slug, label })),
    budgets: BUDGET_BANDS.map(({ slug, label }) => ({ slug, label })),
  };
}
