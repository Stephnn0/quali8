import { setupSubscriptionMetafield } from "./metafields/setupAppSubscriptionMetafield";
import type { AuthAdminContext } from "app/types/utility/shopify";
import { fetchShopMetafieldsData } from "./metafields/fetchShopMefaieldData.server";
import type { PrismaClient } from "@prisma/client";
import { getAppStatus } from "./getAppStatus";
import { setupShopifyStore } from "./setupShopifyStore";
import {
  getFunctionId,
  getShopifyFunctions,
} from "~/models/shopify.server/functions/functions.server";
import { APP } from "~/constants/app.constants";

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

  console.log("App setup complete");
}
