import type { PrismaClient } from "@prisma/client";

/**
 * Whether the shop's active subscription includes the AI assistant suite
 * (Advance plan — `RecurringPlan.hasAssistant`). For contexts without an
 * admin session (app proxies). A shop without a subscription row is on the
 * Free plan → not entitled.
 */
export async function shopHasAssistant(
  shop: string,
  db: PrismaClient,
): Promise<boolean> {
  try {
    const subscription = await db.shopifySubscription.findFirst({
      where: { shop, status: "ACTIVE" },
      select: { recurringPlan: { select: { hasAssistant: true } } },
    });
    return subscription?.recurringPlan?.hasAssistant ?? false;
  } catch (error) {
    console.error("Error checking assistant entitlement:", error);
    return false;
  }
}
