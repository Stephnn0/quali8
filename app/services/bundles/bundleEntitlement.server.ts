import type { PrismaClient } from "@prisma/client";
import { getShopPlan } from "app/services/subscriptions/shopPlan.server";

/**
 * Whether the shop's plan includes bundles (`RecurringPlan.hasBundles`).
 * Every plan does today; the Free plan is capped by `bundleLimit`, which
 * `applyBundleLimit` enforces where bundles are read for the storefront.
 *
 * For contexts without an admin session (app proxy, discount sync), where
 * `gatekeepRoute`/`useGatekeepFeature` can't run.
 */
export async function shopHasBundles(
  shop: string,
  db: PrismaClient,
): Promise<boolean> {
  return (await getShopPlan(shop, db)).hasBundles;
}
