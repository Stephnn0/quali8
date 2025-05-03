import type { ActiveSubscription } from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import { shopifySubscriptionModel } from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import { appModel } from "app/models/shopify.server/app";
import type { AuthAdminContext } from "app/types/utility/shopify";
import db from "app/db.server";
/**
 * Syncs the active subscription from Shopify to the app DB
 *
 * @param authAdminContext - The authentication context
 * @returns The subscription that was synced or null if no active subscription was found
 */
export async function syncShopifyToAppSubscription(
  authAdminContext: AuthAdminContext,
): Promise<ActiveSubscription | null> {
  const activeSubscriptions =
    await appModel.findActiveSubscriptions(authAdminContext);

  console.log("--------------------activeSubscriptions--------------------");
  console.log(JSON.stringify(activeSubscriptions, null, 2));
  console.log("----------------------------------------------------------");

  if (activeSubscriptions?.length) {
    const currentSubscription = activeSubscriptions[0];

    console.log("--------------------currentSubscription--------------------");
    console.log(JSON.stringify(currentSubscription, null, 2));
    console.log("----------------------------------------------------------");

    const processID = crypto.randomUUID();

    return shopifySubscriptionModel.syncSubscription(
      db,
      authAdminContext,
      currentSubscription,
      processID,
    );
  }

  return null;
}
