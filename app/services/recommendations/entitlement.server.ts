import type { PrismaClient } from "@prisma/client";
import { getShopPlan } from "app/services/subscriptions/shopPlan.server";

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
  return (await getShopPlan(shop, db)).hasRecommendations;
}
