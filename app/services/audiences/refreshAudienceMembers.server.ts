import type { PrismaClient } from "@prisma/client";
import { upsertCustomer } from "app/models/app.server/customers/customer.server";
import { getCustomers } from "app/models/shopify.server/customers";
import { buildCustomerQuery } from "app/utils/queryEngine";
import type { AuthAdminContext } from "app/types/utility/shopify";

/**
 * Re-runs an audience's stored conditions against Shopify's customer search
 * and replaces the member snapshot, stamping `lastSyncedAt`. Mirrors what the
 * editor does on save (api.shopifyCustomers + api.qualifiers), but server-side
 * in one step. Returns the new member count, or null if the audience doesn't
 * exist for this shop.
 *
 * NOTE: `getCustomers` fetches the first 50 matches (existing app behavior —
 * same limit the editor uses when building an audience).
 */
export async function refreshAudienceMembers(
  authAdminContext: AuthAdminContext,
  qualifierId: number,
  db: PrismaClient,
): Promise<number | null> {
  const { session, admin } = authAdminContext;

  const qualifier = await db.qualifiers.findFirst({
    where: { id: qualifierId, shop: session.shop },
    include: { conditions: true },
  });
  if (!qualifier) return null;

  const query = buildCustomerQuery(
    qualifier.conditions,
    qualifier.conditionLogicType,
  );
  const edges = (await getCustomers(admin.graphql, query)) ?? [];

  type CustomerEdge = {
    node: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      amountSpent?: { amount?: string | null } | null;
      defaultAddress?: { country?: string | null } | null;
      numberOfOrders?: string | number | null;
    };
  };

  const members = (edges as CustomerEdge[]).map(({ node }) => ({
    shopifyId: node.id,
    firstName: node.firstName ?? undefined,
    lastName: node.lastName ?? undefined,
    amountSpent: Number(node.amountSpent?.amount ?? 0),
    orderCount: Number(node.numberOfOrders ?? 0),
    country: node.defaultAddress?.country ?? undefined,
    shop: session.shop,
    qualifierId: qualifier.id,
  }));

  // Replace the snapshot: clear the M2M links, then reconnect the fresh set.
  await db.qualifiers.update({
    where: { id: qualifier.id },
    data: { customers: { set: [] }, lastSyncedAt: new Date() },
  });
  for (const member of members) {
    await upsertCustomer(db, member);
  }

  return members.length;
}
