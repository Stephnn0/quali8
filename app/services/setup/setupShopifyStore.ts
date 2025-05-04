import type { ShopifyStore } from "@prisma/client";
import type { getShopInfo } from "app/models/shopify.server/shop/shop.server";
import type { AuthAdminContext } from "app/types/utility/shopify";
import { buildShopData } from "./buildShopData";
import db from "app/db.server";
import {
  createShopifyStore,
  updateShopifyStore,
} from "app/models/app.server/shopifyStore/shopifyStore.server";
import { APP_VERSIONS } from "app/constants/versions";

export type SetupShopifyStoreParams = {
  /** The context object containing the admin session and other utilities. */
  authAdminContext: AuthAdminContext;
  /** The Shopify store object */
  shopifyStore: Partial<ShopifyStore> | null;
  /** The status of the Shopify store */
  status: Exclude<ShopifyStore["status"], "UNINSTALLED">;
  /** The Shopify store information */
  shopInfo: NonNullable<Awaited<ReturnType<typeof getShopInfo>>>;

  /** The function ID for the Shopify function */
  functionId?: string;
};

export async function setupShopifyStore({
  status,
  shopInfo,
  shopifyStore,
  authAdminContext,
  functionId,
}: SetupShopifyStoreParams) {
  const {
    session: { shop },
  } = authAdminContext;

  const shopData = buildShopData(shop, shopInfo);

  try {
    const setup = async () => {
      if (!shopifyStore && status === "INSTALLED") {
        return  createShopifyStore( { data:
           { shop, status, functionId,  shopData: { create: shopData.create } } }, db); /* eslint-disable-line max-len */ // prettier-ignore
      }
      if (status === "INSTALLED") {
        return updateShopifyStore( { where: { shop }, data: { status, shopData: { upsert: shopData } } }, db); /* eslint-disable-line max-len */ // prettier-ignore
      }
      if (status === "SETUP") {
        return updateShopifyStore({ where: { shop }, data: { status, appVersion: APP_VERSIONS.CURRENT, shopData: { upsert: shopData } } }, db); /* eslint-disable-line max-len */ // prettier-ignore
      }

      return null;
    };

    const [store] = await Promise.all([setup()]);

    return store;
  } catch (error) {
    console.error("Error setting up Shopify store:", error);
  }
  return null;
}
