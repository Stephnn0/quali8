import type { LoaderFunctionArgs } from "react-router";
import {
  shopifySubscriptionModel,
  type ActiveSubscription,
} from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import type { AuthAdminContext } from "app/types/utility/shopify";
import db from "app/db.server";
import { getShopifyStore } from "app/models/app.server/shopifyStore/shopifyStore.server";
import { FREE_DUMMY_SUBSCRIPTION } from "app/constants/plans";
import { syncShopifyToAppSubscription } from "app/services/billing.server/syncShopifyToAppSubscription";

export async function getSubscription(
  loaderContext: LoaderFunctionArgs,
  authAdminContext: AuthAdminContext,
): Promise<ActiveSubscription> {
  // Check if the store exists before proceeding
  const shop = await getShopifyStore(
    { where: { shop: authAdminContext.session.shop } },
    db,
  );
  if (!shop) return FREE_DUMMY_SUBSCRIPTION as any;

  let subscription: ActiveSubscription | null = null;

  const searchParams = new URL(loaderContext.request.url).searchParams;
  // Our own return URL carries `subscribed`; Shopify's managed pricing page
  // sends the merchant back to /app with `charge_id`. Either means they just
  // changed plan, so pull the subscription from Shopify instead of trusting
  // the webhook alone (it is dropped when the shop has no session yet).
  const justSubscribed =
    searchParams.has("subscribed") || searchParams.has("charge_id");

  if (justSubscribed) {
    subscription = await syncShopifyToAppSubscription(authAdminContext);
  }

  // If an active subscription is not found, we default probably to the Free sub (see flow of shopifySubscriptionModel.findActiveSubscription)
  subscription =
    subscription ||
    (await shopifySubscriptionModel.findActiveSubscription(
      db,
      authAdminContext,
    ));

  return subscription;
}
