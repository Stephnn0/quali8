import { setupSubscriptionMetafield } from "./metafields/setupAppSubscriptionMetafield";
import type { AuthAdminContext } from "app/types/utility/shopify";
import { fetchShopMetafieldsData } from "./metafields/fetchShopMefaieldData.server";
import type { PrismaClient } from "@prisma/client";
import { getAppStatus } from "./getAppStatus";
import { setupShopifyStore } from "./setupShopifyStore";
import {
  getFunctionId,
  getShopifyFunctions,
} from "app/models/shopify.server/functions/functions.server";
import { APP } from "app/constants/app.constants";
import { syncShopifyToAppSubscription } from "app/services/billing.server/syncShopifyToAppSubscription";

export function assertNonNullable<T>(
  value: T,
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`Expected value to be non-nullable, but received ${value}`);
  }
}

export async function setupApp(
  authAdminContext: AuthAdminContext,
  db: PrismaClient,
) {
  const {
    admin: { graphql },
  } = authAdminContext;

  // App Status & ShopInfo
  const [{ isSetup, shopifyStore, shopInfo }, shopMetafieldsData, functions] =
    await Promise.all([
      getAppStatus(authAdminContext, db, false),
      fetchShopMetafieldsData(graphql),
      getShopifyFunctions(graphql),
    ]);

  if (isSetup) return;

  console.log("Setting up the app...");

  // Shopify Store - Create Initial Setup
  assertNonNullable(shopInfo); // * Throws

  
  const functionId = await getFunctionId(functions, APP.APP_HANDLE);

  await setupShopifyStore({
    authAdminContext,
    shopifyStore,
    shopInfo,
    status: "INSTALLED",
    functionId: functionId,
  });

  await setupSubscriptionMetafield(authAdminContext, shopMetafieldsData, db);

  await setupShopifyStore({
    authAdminContext,
    shopifyStore,
    shopInfo,
    status: "SETUP",
  });

  // A shop can already hold a paid subscription when its store row is
  // created (reinstall, or the APP_SUBSCRIPTIONS_UPDATE webhook arrived
  // before the first session existed and was dropped). Pull it now so the
  // merchant is not gated out of what they pay for. Never fatal for setup.
  try {
    await syncShopifyToAppSubscription(authAdminContext);
  } catch (error) {
    console.error("Setup: could not sync the subscription from Shopify", error); // eslint-disable-line no-console
  }

  console.log("App setup complete");
}
