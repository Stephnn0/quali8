import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import type { PrismaClient } from "@prisma/client";
import { loadAlcoholRules } from "./alcoholRules.server";
import { membershipQuery, numericId, restrictedProductIds, toMemberships } from "./alcoholProducts";

export type AlcoholCheckResult = {
  /** False when the rules are off or no collection is configured */
  enabled: boolean;
  /** Numeric product ids (as the storefront sent them) that are alcohol */
  restricted: string[];
};

export const EMPTY_ALCOHOL_CHECK: AlcoholCheckResult = { enabled: false, restricted: [] };

/** Which of `productGids` are in the shop's alcohol collections (Admin `inCollection`). */
export async function checkAlcoholProducts(
  db: PrismaClient,
  graphql: AdminGraphqlClient,
  shop: string,
  productGids: string[],
): Promise<AlcoholCheckResult> {
  const rules = await loadAlcoholRules(db, shop);
  if (!rules.enabled || rules.collections.length === 0) return EMPTY_ALCOHOL_CHECK;
  if (productGids.length === 0) return { enabled: true, restricted: [] };

  const variables: Record<string, unknown> = { ids: productGids };
  rules.collections.forEach((collection, index) => {
    variables[`c${index}`] = collection.id;
  });
  const response = await graphql(membershipQuery(rules.collections.length), { variables });
  const body = (await response.json()) as {
    data?: { nodes: Array<Record<string, unknown> | null> };
    errors?: Array<{ message?: string }>;
  };
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message ?? "GraphQL error").join("; "));

  const memberships = toMemberships(body.data?.nodes ?? [], rules.collections.length);
  return { enabled: true, restricted: restrictedProductIds(memberships).map(numericId) };
}
