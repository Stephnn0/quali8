import type { PrismaClient } from "@prisma/client";
import { APP_PLANS } from "app/constants/plans";

/** The plan flags and limits the app gates on, for one shop. */
export type ShopPlanEntitlements = {
  name: string;
  hasQualifiers: boolean;
  hasShippingDiscounts: boolean;
  hasBundles: boolean;
  hasRecommendations: boolean;
  hasAssistant: boolean;
  hasAnnouncements: boolean;
  hasDeliveryZones: boolean;
  hasSubscribePopup: boolean;
  /** Null = unlimited. */
  bundleLimit: number | null;
  /** Per calendar month. Null = unlimited. */
  popupSignupLimit: number | null;
};

const FREE_ENTITLEMENTS: ShopPlanEntitlements = {
  name: APP_PLANS.FREE.name,
  hasQualifiers: APP_PLANS.FREE.hasQualifiers,
  hasShippingDiscounts: APP_PLANS.FREE.hasShippingDiscounts,
  hasBundles: APP_PLANS.FREE.hasBundles,
  hasRecommendations: APP_PLANS.FREE.hasRecommendations,
  hasAssistant: APP_PLANS.FREE.hasAssistant,
  hasAnnouncements: APP_PLANS.FREE.hasAnnouncements,
  hasDeliveryZones: APP_PLANS.FREE.hasDeliveryZones,
  hasSubscribePopup: APP_PLANS.FREE.hasSubscribePopup,
  bundleLimit: APP_PLANS.FREE.bundleLimit,
  popupSignupLimit: APP_PLANS.FREE.popupSignupLimit,
};

/**
 * The shop's plan entitlements from its active subscription row, for
 * contexts without an admin session (app proxies, the carrier callback,
 * the discount sync) where `gatekeepRoute` can't run. A shop with no
 * subscription row is on the Free plan. On a database error the shop is
 * treated as Free as well, so a paid feature never opens by accident.
 */
export async function getShopPlan(
  shop: string,
  db: PrismaClient,
): Promise<ShopPlanEntitlements> {
  try {
    const subscription = await db.shopifySubscription.findFirst({
      where: { shop, status: "ACTIVE" },
      select: {
        recurringPlan: {
          select: {
            name: true,
            hasQualifiers: true,
            hasShippingDiscounts: true,
            hasBundles: true,
            hasRecommendations: true,
            hasAssistant: true,
            hasAnnouncements: true,
            hasDeliveryZones: true,
            hasSubscribePopup: true,
            bundleLimit: true,
            popupSignupLimit: true,
          },
        },
      },
    });
    return subscription?.recurringPlan ?? FREE_ENTITLEMENTS;
  } catch (error) {
    console.error("Error reading the shop's plan:", error); // eslint-disable-line no-console
    return FREE_ENTITLEMENTS;
  }
}
