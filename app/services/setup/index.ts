import { setupSubscriptionMetafield } from "./metafields/setupAppSubscriptionMetafield";
import type { AuthAdminContext } from "app/types/utility/shopify";
import { fetchShopMetafieldsData } from "./metafields/fetchShopMefaieldData.server";
import type { PrismaClient } from "@prisma/client";
import { getAppStatus } from "./getAppStatus";
import { setupShopifyStore } from "./setupShopifyStore";

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
  const [{ isSetup, shopifyStore, shopInfo }, shopMetafieldsData] =
    await Promise.all([
      getAppStatus(authAdminContext, db, false),
      fetchShopMetafieldsData(graphql),
    ]);

  if (isSetup) return;

  console.log("Setting up the app...");

  // Shopify Store - Create Initial Setup
  assertNonNullable(shopInfo); // * Throws

  await setupShopifyStore({
    authAdminContext,
    shopifyStore,
    shopInfo,
    status: "INSTALLED",
  });

  await setupSubscriptionMetafield(authAdminContext, shopMetafieldsData, db);

  await setupShopifyStore({
    authAdminContext,
    shopifyStore,
    shopInfo,
    status: "SETUP",
  });

  console.log("App setup complete");
}
