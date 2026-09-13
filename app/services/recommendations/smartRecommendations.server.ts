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
import { assembleRails } from "./smartRails";
import { needsCollections, pickRules, type ShopperFacts } from "./smartRules";

export type SmartRecommendationRequest = {
  shop: string;
  /** Product GIDs currently in the cart. */
  cartProductIds: string[];
  /** Cart subtotal in the shop currency, or null when the block didn't send it. */
  cartTotal: number | null;
  /** Product GIDs the shopper viewed, newest first. */
  viewedProductIds: string[];
  /** Collection GIDs of the viewed products. */
  viewedCollectionIds: string[];
  /** First seen before today. */
  returning: boolean;
  /** Which matching rule to return: 1, 2 or 3 (one block instance per slot). */
  slot: number;
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

/**
 * For RELATED_TO_VIEWED rules the block asks Shopify's public
 * `/recommendations/products.json` itself (the app has no Storefront token)
 * and applies these filters client-side.
 */
export type RelatedRail = {
  /** Numeric product id of the most recently viewed product. */
  seedProductId: string;
  limit: number;
  minPrice: number | null;
  maxPrice: number | null;
  excludeCartItems: boolean;
};

export type SmartRecommendationResponse = {
  products: SmartRecommendedProduct[];
  /** The matched rule's storefront heading, if it set one. */
  heading: string | null;
  ruleId: number | null;
  /** True when no rule exists and the newest products were shown instead. */
  fallbackUsed: boolean;
  related?: RelatedRail;
};

/** Shape stored in RecommendationRule.sourceProducts. */
export type RuleSourceProduct = {
  productId: string;
  title: string;
  imageUrl: string | null;
};

export const EMPTY_RESPONSE: SmartRecommendationResponse = {
  products: [],
  heading: null,
  ruleId: null,
  fallbackUsed: false,
};

const toProduct = (product: SellableProduct): SmartRecommendedProduct => ({
  productId: product.id,
  variantId: product.variantId,
  title: product.title,
  price: product.price,
  imageUrl: product.imageUrl,
  handle: product.handle,
});

const numericId = (gid: string): string => gid.split("/").pop() ?? gid;

/** Live products for a list of ids, in the order given, dropping anything no longer sellable. */
async function liveInOrder(
  graphql: AdminGraphqlClient,
  ids: string[],
): Promise<SellableProduct[]> {
  const live = await getProductsByIds(graphql, ids);
  return ids
    .map((id) => live.get(id))
    .filter((product): product is SellableProduct => Boolean(product));
}

async function sourceProducts(
  graphql: AdminGraphqlClient,
  rule: RecommendationRule,
  facts: ShopperFacts,
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
      return liveInOrder(graphql, picked.map((product) => product.productId));
    }
    case "RECENTLY_VIEWED":
      return liveInOrder(graphql, facts.viewedProductIds);
    case "RELATED_TO_VIEWED":
      // Resolved in the storefront block; see RelatedRail.
      return [];
  }
}

/**
 * Smart Recommendations for the home page block: evaluates the shop's rules
 * against the shopper (cart, viewed products, returning flag), resolves the
 * usable rules' sources in order, and returns the rail for the requested
 * slot with no product repeated across slots. With no rules at all the
 * newest products are shown in slot 1 so the block works before the
 * merchant has configured anything.
 */
export async function recommendForShopper(
  db: PrismaClient,
  graphql: AdminGraphqlClient,
  request: SmartRecommendationRequest,
): Promise<SmartRecommendationResponse> {
  const cap = Math.max(1, request.maxProducts ?? 12);
  const slot = Math.max(1, request.slot);
  const inCart = new Set(request.cartProductIds);

  const rules = await db.recommendationRule.findMany({
    where: { shop: request.shop, status: "ACTIVE" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  if (rules.length === 0) {
    if (slot !== 1) return EMPTY_RESPONSE;
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
      const byProduct = await getProductCollectionIds(graphql, request.cartProductIds);
      collectionIds = [...new Set([...byProduct.values()].flat())];
    } catch (error) {
      console.error("Cart collection lookup failed:", error);
    }
  }

  const facts: ShopperFacts = {
    productIds: request.cartProductIds,
    collectionIds,
    total: request.cartTotal,
    viewedProductIds: request.viewedProductIds,
    viewedCollectionIds: request.viewedCollectionIds,
    returning: request.returning,
  };

  const matched = pickRules(rules, facts).slice(0, slot);
  if (matched.length < slot) return EMPTY_RESPONSE;

  const target = matched[slot - 1];
  if (target.source === "RELATED_TO_VIEWED") {
    return {
      products: [],
      heading: target.heading?.trim() || null,
      ruleId: target.id,
      fallbackUsed: false,
      related: {
        seedProductId: numericId(request.viewedProductIds[0]),
        limit: Math.min(cap, target.limit),
        minPrice: target.minPrice,
        maxPrice: target.maxPrice,
        excludeCartItems: target.excludeCartItems,
      },
    };
  }

  const pools = new Map<number, SmartRecommendedProduct[]>();
  for (const rule of matched) {
    try {
      pools.set(rule.id, (await sourceProducts(graphql, rule, facts)).map(toProduct));
    } catch (error) {
      console.error("Recommendation rule source fetch failed:", rule.id, error);
      pools.set(rule.id, []);
    }
  }

  const rails = assembleRails(matched, pools, inCart, cap);
  return {
    products: rails[slot - 1] ?? [],
    heading: target.heading?.trim() || null,
    ruleId: target.id,
    fallbackUsed: false,
  };
}
