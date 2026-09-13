/**
 * Pure rail assembly for Smart Recommendations. Given the usable rules (in
 * order) and each rule's candidate pool, produces one rail per rule with
 * the rule's own filters applied and no product repeated across rails, so
 * a merchant who stacks two blocks on the home page never shows the same
 * product twice.
 */
import { withinPrice } from "./smartRules";

export type RailRule = {
  id: number;
  limit: number;
  minPrice: number | null;
  maxPrice: number | null;
  excludeCartItems: boolean;
};

export type RailProduct = {
  productId: string;
  price: number;
};

export function assembleRails<P extends RailProduct>(
  rules: RailRule[],
  pools: Map<number, P[]>,
  inCart: Set<string>,
  cap: number,
): P[][] {
  const used = new Set<string>();
  return rules.map((rule) => {
    const rail: P[] = [];
    const max = Math.max(1, Math.min(cap, rule.limit));
    for (const product of pools.get(rule.id) ?? []) {
      if (used.has(product.productId)) continue;
      if (rule.excludeCartItems && inCart.has(product.productId)) continue;
      if (!withinPrice(product.price, rule.minPrice, rule.maxPrice)) continue;
      used.add(product.productId);
      rail.push(product);
      if (rail.length >= max) break;
    }
    return rail;
  });
}
