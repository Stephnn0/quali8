import type { ActiveSubscription } from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import { shopifySubscriptionModel } from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import { appModel } from "app/models/shopify.server/app";
import type { AuthAdminContext } from "app/types/utility/shopify";
import db from "app/db.server";

/**
 * What the sync needs from an admin context: the GraphQL client and the
 * offline session. Both `authenticate.admin(request)` and
 * `unauthenticated.admin(shop)` provide it, so the owner overview can
 * resync any shop that still has an offline session.
 */
export type SubscriptionSyncContext = Pick<AuthAdminContext, "admin" | "session">;

/**
 * Syncs the active subscription from Shopify to the app DB
 *
 * @param authAdminContext - The authentication context
 * @returns The subscription that was synced or null if no active subscription was found
 */
export async function syncShopifyToAppSubscription(
  syncContext: SubscriptionSyncContext,
): Promise<ActiveSubscription | null> {
  // The models only read `admin` and `session` from the context.
  const authAdminContext = syncContext as AuthAdminContext;
  const activeSubscriptions =
    await appModel.findActiveSubscriptions(authAdminContext);

  if (activeSubscriptions?.length) {
    const currentSubscription = activeSubscriptions[0];

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
