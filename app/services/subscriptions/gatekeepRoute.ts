import type { AuthAdminContext } from "app/types/utility/shopify";
import type {
  GateKeepCriteria,
  GateKeepCode,
  GateKeepArgs,
} from "./gatekeep/types";
import db from "app/db.server";
import { getShopInfo } from "app/models/shopify.server/shop/shop.server";
import { shopifySubscriptionModel } from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import { gatekeep } from "./gatekeep/gatekeep";

export async function gatekeepRoute(
  currentContext: { authAdminContext: AuthAdminContext },
  criteria: GateKeepCriteria,
  action: "redirect" | "throw" | "return",
) {
  const { authAdminContext } = currentContext;
  const { admin, session } = authAdminContext;

  let redirectCode: GateKeepCode | null = null;

  try {
    const [shopInfo, subscription] = await Promise.all([
      // Gets the necessary shop information from Shopify
      getShopInfo(admin.graphql),

      // Finds the active subscription for the shop or defaults to the `Free` plan if not found
      shopifySubscriptionModel.findActiveSubscription(db, authAdminContext),
    ]);

    if (!shopInfo) {
      redirectCode = "NS001"; // If the shopInfo is not available, we gatekeep the feature
    } //
    else {
      const current: GateKeepArgs["current"] = {
        subscription,
        shop: session.shop,
        shopPlan: shopInfo.shop.plan.displayName,
        isDevStore: shopInfo.shop.plan.partnerDevelopment,
      };

      redirectCode = gatekeep({ current, criteria });
    }
  } catch (error) {
    console.error("Error in gatekeepRoute:", error);
    redirectCode = "NS001";
  }

  // Redirect if the store does not meet the required criteria
  if (redirectCode) {
    if (action === "throw") throw redirectCode;
    if (action === "return") return redirectCode;
    if (action === "redirect")
      throw authAdminContext.redirect(`/app/gatekeep?code=${redirectCode}`); // TODO - use PATHS
  }
}
