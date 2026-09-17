/**
 * Which of the cart's products sit in an alcohol collection — the pure
 * half of the `alcohol-check` proxy. The Admin query is built here as a
 * string because it has one aliased `inCollection` per configured
 * collection, so it cannot be a static codegen document.
 */

export const MAX_CHECKED_PRODUCTS = 100;

export type ProductMembership = { id: string; flags: boolean[] } | null;

/** Product GIDs whose membership flags hit at least one alcohol collection. */
export function restrictedProductIds(nodes: ProductMembership[]): string[] {
  return nodes.flatMap((node) => (node && node.flags.some(Boolean) ? [node.id] : []));
}

/** "1, 2,x,1" → ["gid://shopify/Product/1", "gid://shopify/Product/2"]; distinct numeric ids only. */
export function parseProductIds(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  for (const part of String(raw ?? "").split(",")) {
    const id = part.trim();
    if (/^\d+$/.test(id)) seen.add(`gid://shopify/Product/${id}`);
    if (seen.size >= MAX_CHECKED_PRODUCTS) break;
  }
  return Array.from(seen);
}

/** "gid://shopify/Product/123" → "123" (what the storefront sent). */
export const numericId = (gid: string): string => gid.split("/").pop() ?? gid;

/** `nodes(ids) { ... on Product { id c0: inCollection(id: $c0) … } }` for N collections. */
export function membershipQuery(collectionCount: number): string {
  const vars = Array.from({ length: collectionCount }, (_, i) => `$c${i}: ID!`).join(", ");
  const fields = Array.from({ length: collectionCount }, (_, i) => `c${i}: inCollection(id: $c${i})`).join(" ");
  return `query AlcoholMembership($ids: [ID!]!, ${vars}) { nodes(ids: $ids) { ... on Product { id ${fields} } } }`;
}

/** Turns the raw `nodes` payload into memberships, in the collections' order. */
export function toMemberships(
  nodes: Array<Record<string, unknown> | null>,
  collectionCount: number,
): ProductMembership[] {
  return nodes.map((node) =>
    node && typeof node.id === "string"
      ? { id: node.id, flags: Array.from({ length: collectionCount }, (_, i) => node[`c${i}`] === true) }
      : null,
  );
}
