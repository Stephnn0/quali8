/**
 * Pure rule evaluation for Smart Recommendations (the home page block). No
 * server imports — fully unit tested. The server module loads the shop's
 * rules and the shopper's facts (cart, viewed products, returning flag),
 * then this picks the rules that apply, in position order.
 */

export type RuleTrigger =
  | "ALWAYS"
  | "CART_HAS_COLLECTION"
  | "CART_HAS_PRODUCT"
  | "CART_TOTAL_MIN"
  | "VIEWED_COLLECTION"
  | "VIEWED_PRODUCT"
  | "RETURNING_VISITOR";

export type RuleSource =
  | "COLLECTION"
  | "TAG"
  | "NEWEST"
  | "PRODUCTS"
  | "RECENTLY_VIEWED"
  | "RELATED_TO_VIEWED";

export type RuleLike = {
  position: number;
  trigger: RuleTrigger;
  triggerCollectionId: string | null;
  triggerProductId: string | null;
  triggerMinTotal: number | null;
  source: RuleSource;
};

export type ShopperFacts = {
  /** Product GIDs in the cart. */
  productIds: string[];
  /** Collection GIDs any cart product belongs to (may be unknown = []). */
  collectionIds: string[];
  /** Cart subtotal in the shop currency, or null when not sent. */
  total: number | null;
  /** Product GIDs the shopper viewed, newest first (from the tracker embed). */
  viewedProductIds: string[];
  /** Collection GIDs of the viewed products. */
  viewedCollectionIds: string[];
  /** First seen before today. */
  returning: boolean;
};

export function ruleMatches(rule: RuleLike, facts: ShopperFacts): boolean {
  switch (rule.trigger) {
    case "ALWAYS":
      return true;
    case "CART_HAS_COLLECTION":
      return (
        rule.triggerCollectionId !== null &&
        facts.collectionIds.includes(rule.triggerCollectionId)
      );
    case "CART_HAS_PRODUCT":
      return (
        rule.triggerProductId !== null &&
        facts.productIds.includes(rule.triggerProductId)
      );
    case "CART_TOTAL_MIN":
      return (
        rule.triggerMinTotal !== null &&
        facts.total !== null &&
        facts.total >= rule.triggerMinTotal
      );
    case "VIEWED_COLLECTION":
      return (
        rule.triggerCollectionId !== null &&
        facts.viewedCollectionIds.includes(rule.triggerCollectionId)
      );
    case "VIEWED_PRODUCT":
      return (
        rule.triggerProductId !== null &&
        facts.viewedProductIds.includes(rule.triggerProductId)
      );
    case "RETURNING_VISITOR":
      return facts.returning;
  }
}

/** True when the rule matches and its source can produce anything for this shopper. */
export function ruleUsable(rule: RuleLike, facts: ShopperFacts): boolean {
  if (!ruleMatches(rule, facts)) return false;
  if (rule.source === "RECENTLY_VIEWED" || rule.source === "RELATED_TO_VIEWED") {
    return facts.viewedProductIds.length > 0;
  }
  return true;
}

/** Every usable rule, by position. Index 0 is rail 1, index 1 is rail 2, … */
export function pickRules<T extends RuleLike>(rules: T[], facts: ShopperFacts): T[] {
  return [...rules]
    .sort((a, b) => a.position - b.position)
    .filter((rule) => ruleUsable(rule, facts));
}

/** The first usable rule, or null. */
export function pickRule<T extends RuleLike>(rules: T[], facts: ShopperFacts): T | null {
  return pickRules(rules, facts)[0] ?? null;
}

/** True when evaluating these rules needs the cart's collection ids (Admin API lookup). */
export function needsCollections(rules: RuleLike[]): boolean {
  return rules.some((rule) => rule.trigger === "CART_HAS_COLLECTION");
}

export function withinPrice(
  price: number,
  min: number | null,
  max: number | null,
): boolean {
  if (min !== null && price < min) return false;
  if (max !== null && price > max) return false;
  return true;
}
