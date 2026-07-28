/**
 * Pure ranking for Smart Recommendations. No server imports — fully unit
 * tested. Candidates come from getCandidates.server; this module filters,
 * scores, and explains.
 */

import {
  BUDGET_BANDS,
  RECIPIENTS,
  TAG_PREFIX,
  type BudgetSlug,
  type RecipientSlug,
  type Season,
} from "./constants";

export type Candidate = {
  productId: string;
  variantId: string | null;
  title: string;
  price: number;
  imageUrl: string | null;
  handle: string | null;
  tags: string[];
  productType: string | null;
  /** True when the merchant curated this product for the selected occasion. */
  curatedForOccasion: boolean;
};

export type RecommendationContext = {
  occasionSlug: string | null;
  occasionName: string | null;
  recipient: RecipientSlug | null;
  budget: BudgetSlug | null;
  season: Season;
  /** Product GIDs to exclude (current product, cart contents). */
  excludeProductIds: string[];
  /** Product types from the shopper's past orders (may be empty). */
  purchasedProductTypes: string[];
  /** Exact products the shopper already bought. */
  purchasedProductIds: string[];
};

export type RecommendedProduct = {
  productId: string;
  variantId: string | null;
  title: string;
  price: number;
  imageUrl: string | null;
  handle: string | null;
  /** The single strongest explanation chip. */
  reason: string | null;
  score: number;
};

const WEIGHTS = {
  curated: 5,
  occasionTag: 4,
  recipient: 3,
  budget: 3,
  purchaseAffinity: 2,
  season: 1,
} as const;

export function budgetBand(slug: BudgetSlug | null) {
  return BUDGET_BANDS.find((band) => band.slug === slug) ?? null;
}

function recipientLabel(slug: RecipientSlug): string {
  return RECIPIENTS.find((r) => r.slug === slug)?.label ?? slug;
}

export function scoreCandidate(
  candidate: Candidate,
  context: RecommendationContext,
): { score: number; reason: string | null } {
  let score = 0;
  // reasons collected strongest-first; first one wins the chip
  const reasons: Array<{ weight: number; text: string }> = [];
  const tags = candidate.tags.map((tag) => tag.toLowerCase().trim());

  if (context.occasionSlug) {
    const occasionText = context.occasionName
      ? `Perfect for ${context.occasionName}`
      : "Perfect for the occasion";
    if (candidate.curatedForOccasion) {
      score += WEIGHTS.curated;
      reasons.push({ weight: WEIGHTS.curated, text: occasionText });
    } else if (tags.includes(TAG_PREFIX.occasion + context.occasionSlug)) {
      score += WEIGHTS.occasionTag;
      reasons.push({ weight: WEIGHTS.occasionTag, text: occasionText });
    }
  }

  if (
    context.recipient &&
    tags.includes(TAG_PREFIX.recipient + context.recipient)
  ) {
    score += WEIGHTS.recipient;
    reasons.push({
      weight: WEIGHTS.recipient,
      text: `Great ${recipientLabel(context.recipient).toLowerCase()}`,
    });
  }

  const band = budgetBand(context.budget);
  if (band) {
    const fits =
      candidate.price >= band.min &&
      (band.max === null || candidate.price <= band.max);
    if (fits) {
      score += WEIGHTS.budget;
      reasons.push({ weight: WEIGHTS.budget, text: "Within your budget" });
    }
  }

  if (
    candidate.productType &&
    context.purchasedProductTypes.some(
      (type) => type.toLowerCase() === candidate.productType?.toLowerCase(),
    )
  ) {
    score += WEIGHTS.purchaseAffinity;
    reasons.push({
      weight: WEIGHTS.purchaseAffinity,
      text: "Based on your past orders",
    });
  }

  if (tags.includes(TAG_PREFIX.season + context.season)) {
    score += WEIGHTS.season;
    reasons.push({ weight: WEIGHTS.season, text: "In season now" });
  }

  reasons.sort((a, b) => b.weight - a.weight);
  return { score, reason: reasons[0]?.text ?? null };
}

/**
 * Filter, dedupe, score, and rank candidates. When a budget band is
 * selected, products outside it are dropped entirely (a $300 bouquet is
 * noise for an "Under $50" shopper), not just down-ranked.
 */
export function rankCandidates(
  candidates: Candidate[],
  context: RecommendationContext,
  limit = 4,
): RecommendedProduct[] {
  const excluded = new Set([
    ...context.excludeProductIds,
    ...context.purchasedProductIds,
  ]);
  const band = budgetBand(context.budget);

  const seen = new Set<string>();
  const scored: RecommendedProduct[] = [];

  for (const candidate of candidates) {
    if (excluded.has(candidate.productId)) continue;
    if (seen.has(candidate.productId)) continue;
    seen.add(candidate.productId);

    if (
      band &&
      (candidate.price < band.min ||
        (band.max !== null && candidate.price > band.max))
    ) {
      continue;
    }

    const { score, reason } = scoreCandidate(candidate, context);
    scored.push({
      productId: candidate.productId,
      variantId: candidate.variantId,
      title: candidate.title,
      price: candidate.price,
      imageUrl: candidate.imageUrl,
      handle: candidate.handle,
      reason,
      score,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, limit);
}
