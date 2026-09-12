import type { PrismaClient, RecommendationRule } from "@prisma/client";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  getCollectionProducts,
  getProductCollectionIds,
  getProductsByIds,
  getProductsByQuery,
  getRecentProducts,
  type SellableProduct,
} from "app/models/shopify.server/recommendations";
import { needsCollections, pickRule, withinPrice } from "./smartRules";

export type SmartRecommendationRequest = {
  shop: string;
  /** Product GIDs currently in the cart. */
  cartProductIds: string[];
  /** Cart subtotal in the shop currency, or null when the block didn't send it. */
  cartTotal: number | null;
  /** Hard cap from the storefront block (the rule's own limit still applies). */
  maxProducts?: number;
};

export type SmartRecommendedProduct = {
  productId: string;
  variantId: string | null;
  title: string;
  price: number;
  imageUrl: string | null;
  handle: string | null;
};

export type SmartRecommendationResponse = {
  products: SmartRecommendedProduct[];
  /** The matched rule's storefront heading, if it set one. */
  heading: string | null;
  ruleId: number | null;
  /** True when no rule exists and the newest products were shown instead. */
  fallbackUsed: boolean;
};

/** Shape stored in RecommendationRule.sourceProducts. */
export type RuleSourceProduct = {
  productId: string;
  title: string;
  imageUrl: string | null;
};

const toProduct = (product: SellableProduct): SmartRecommendedProduct => ({
  productId: product.id,
  variantId: product.variantId,
  title: product.title,
  price: product.price,
  imageUrl: product.imageUrl,
  handle: product.handle,
});

async function sourceProducts(
  graphql: AdminGraphqlClient,
  rule: RecommendationRule,
): Promise<SellableProduct[]> {
  switch (rule.source) {
    case "COLLECTION":
      return rule.sourceCollectionId
        ? getCollectionProducts(graphql, rule.sourceCollectionId, 40)
        : [];
    case "TAG":
      return rule.sourceTag
        ? getProductsByQuery(
            graphql,
            `tag:'${rule.sourceTag.replace(/'/g, "")}' status:active`,
            40,
          )
        : [];
    case "NEWEST":
      return getRecentProducts(graphql, 40);
    case "PRODUCTS": {
      const picked = (rule.sourceProducts as RuleSourceProduct[] | null) ?? [];
      const live = await getProductsByIds(
        graphql,
        picked.map((product) => product.productId),
      );
      // Keep the merchant's order; drop anything no longer sellable
      return picked
        .map((product) => live.get(product.productId))
        .filter((product): product is SellableProduct => Boolean(product));
    }
  }
}

/**
 * Smart Recommendations for the cart block: evaluates the shop's rules
 * against the cart, then resolves the winning rule's source into sellable
 * products. With no rules at all the newest products are shown so the
 * block works before the merchant has configured anything.
 */
export async function recommendForCart(
  db: PrismaClient,
  graphql: AdminGraphqlClient,
  request: SmartRecommendationRequest,
): Promise<SmartRecommendationResponse> {
  const cap = Math.max(1, request.maxProducts ?? 12);
  const inCart = new Set(request.cartProductIds);

  const rules = await db.recommendationRule.findMany({
    where: { shop: request.shop, status: "ACTIVE" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  if (rules.length === 0) {
    const newest = await getRecentProducts(graphql, 40);
    return {
      products: newest
        .filter((product) => !inCart.has(product.id))
        .slice(0, Math.min(cap, 4))
        .map(toProduct),
      heading: null,
      ruleId: null,
      fallbackUsed: true,
    };
  }

  let collectionIds: string[] = [];
  if (needsCollections(rules) && request.cartProductIds.length > 0) {
    try {
      const byProduct = await getProductCollectionIds(
        graphql,
        request.cartProductIds,
      );
      collectionIds = [...new Set([...byProduct.values()].flat())];
    } catch (error) {
      console.error("Cart collection lookup failed:", error);
    }
  }

  const rule = pickRule(rules, {
    productIds: request.cartProductIds,
    collectionIds,
    total: request.cartTotal,
  });
  if (!rule) {
    return { products: [], heading: null, ruleId: null, fallbackUsed: false };
  }

  let pool: SellableProduct[] = [];
  try {
    pool = await sourceProducts(graphql, rule);
  } catch (error) {
    console.error("Recommendation rule source fetch failed:", rule.id, error);
  }

  const seen = new Set<string>();
  const products: SmartRecommendedProduct[] = [];
  for (const product of pool) {
    if (seen.has(product.id)) continue;
    if (rule.excludeCartItems && inCart.has(product.id)) continue;
    if (!withinPrice(product.price, rule.minPrice, rule.maxPrice)) continue;
    seen.add(product.id);
    products.push(toProduct(product));
    if (products.length >= Math.min(cap, rule.limit)) break;
  }

  return {
    products,
    heading: rule.heading?.trim() || null,
    ruleId: rule.id,
    fallbackUsed: false,
  };
}
