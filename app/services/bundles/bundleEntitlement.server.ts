import type { PrismaClient } from "@prisma/client";

/**
 * Whether the shop's active subscription includes bundles (Pro plan —
 * `RecurringPlan.hasBundles`).
 *
 * For contexts without an admin session (app proxy, discount sync), where
 * `gatekeepRoute`/`useGatekeepFeature` can't run. A shop without a
 * subscription row is on the Free plan → not entitled.
 */
export async function shopHasBundles(
  shop: string,
  db: PrismaClient,
): Promise<boolean> {
  try {
    const subscription = await db.shopifySubscription.findFirst({
      where: { shop, status: "ACTIVE" },
      select: { recurringPlan: { select: { hasBundles: true } } },
    });
    return subscription?.recurringPlan?.hasBundles ?? false;
  } catch (error) {
    console.error("Error checking bundles entitlement:", error);
    return false;
  }
}
