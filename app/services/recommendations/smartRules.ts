/**
 * Pure rule evaluation for Smart Recommendations (the cart block). No
 * server imports — fully unit tested. The server module loads the shop's
 * rules and the cart's facts, then this picks the rule that applies.
 */

export type RuleTrigger =
  | "ALWAYS"
  | "CART_HAS_COLLECTION"
  | "CART_HAS_PRODUCT"
  | "CART_TOTAL_MIN";

export type RuleLike = {
  position: number;
  trigger: RuleTrigger;
  triggerCollectionId: string | null;
  triggerProductId: string | null;
  triggerMinTotal: number | null;
};

export type CartFacts = {
  /** Product GIDs in the cart. */
  productIds: string[];
  /** Collection GIDs any cart product belongs to (may be unknown = []). */
  collectionIds: string[];
  /** Cart subtotal in the shop currency, or null when not sent. */
  total: number | null;
};

export function ruleMatches(rule: RuleLike, cart: CartFacts): boolean {
  switch (rule.trigger) {
    case "ALWAYS":
      return true;
    case "CART_HAS_COLLECTION":
      return (
        rule.triggerCollectionId !== null &&
        cart.collectionIds.includes(rule.triggerCollectionId)
      );
    case "CART_HAS_PRODUCT":
      return (
        rule.triggerProductId !== null &&
        cart.productIds.includes(rule.triggerProductId)
      );
    case "CART_TOTAL_MIN":
      return (
        rule.triggerMinTotal !== null &&
        cart.total !== null &&
        cart.total >= rule.triggerMinTotal
      );
  }
}

/** The first rule (by position) whose trigger matches the cart, or null. */
export function pickRule<T extends RuleLike>(
  rules: T[],
  cart: CartFacts,
): T | null {
  const ordered = [...rules].sort((a, b) => a.position - b.position);
  return ordered.find((rule) => ruleMatches(rule, cart)) ?? null;
}

/** True when evaluating these rules needs the cart's collection ids. */
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
