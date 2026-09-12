import type { PrismaClient } from "@prisma/client";

/**
 * Whether the shop's active subscription includes Smart Recommendations
 * (Advance plan — `RecurringPlan.hasRecommendations`).
 *
 * For contexts without an admin session (the app proxy), where
 * `gatekeepRoute`/`useGatekeepFeature` can't run. A shop without a
 * subscription row is on the Free plan → not entitled.
 */
export async function shopHasRecommendations(
  shop: string,
  db: PrismaClient,
): Promise<boolean> {
  try {
    const subscription = await db.shopifySubscription.findFirst({
      where: { shop, status: "ACTIVE" },
      select: { recurringPlan: { select: { hasRecommendations: true } } },
    });
    return subscription?.recurringPlan?.hasRecommendations ?? false;
  } catch (error) {
    console.error("Error checking recommendations entitlement:", error);
    return false;
  }
}
