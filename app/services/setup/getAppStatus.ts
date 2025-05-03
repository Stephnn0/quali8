import type { PrismaClient } from "@prisma/client";
import { getShopInfo } from "app/models/shopify.server/shop/shop.server";
import type { AuthAdminContext } from "app/types/utility/shopify";

export async function getAppStatus(
  authAdminContext: AuthAdminContext,
  db: PrismaClient,
  shouldRedirect: boolean = true,
) {
  const {
    session: { shop },
    redirect,
  } = authAdminContext;
  console.log("--------------getAppStatus----------------------");

  // -----------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------
  // Check if there's a Shopify store
  const shopInfoPromise = getShopInfo(authAdminContext.admin.graphql);

  const shopifyStorePromise = db.shopifyStore.findUnique({
    where: { shop },
    select: { appVersion: true, status: true },
  });

  const [shopifyStore, shopInfo] = await Promise.all([
    shopifyStorePromise,
    shopInfoPromise,
  ]);

  console.log("--------------getAppStatus 2----------------------");

  console.log("shopifyStore", shopifyStore);
  console.log("shopInfo", shopInfo);

  if (!shopifyStore && shouldRedirect) throw redirect("/setup");
  else if (!shopifyStore) return { isSetup: false, shopifyStore, shopInfo };
  // -----------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------
  console.log("--------------getAppStatus 3----------------------");

  // -----------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------
  // Check if the app is setup
  const { status } = shopifyStore;

  const isSetup = status === "SETUP";

  console.log("--------------getAppStatus 4----------------------");

  if (!isSetup && shouldRedirect) throw redirect("/setup");

  console.log("--------------getAppStatus 5----------------------");

  return { isSetup, shopifyStore, shopInfo };
}
