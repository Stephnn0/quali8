import type { PrismaClient } from "@prisma/client";
import { getShopInfo } from "app/models/shopify.server/shop/shop.server";
import type { AuthAdminContext } from "app/types/utility/shopify";

export async function getAppStatus(
  authAdminContext: AuthAdminContext,
  db: PrismaClient,
  shouldRedirect: boolean = true,
) {
  console.log("---------------------- getAppStatus---------------------");

  const {
    session: { shop },
    redirect,
  } = authAdminContext;

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

  console.log(
    "---------------------- shopifyStore---------------------",
    shopifyStore,
  );
  console.log("---------------------- shopInfo---------------------", shopInfo);

  if (!shopifyStore && shouldRedirect) throw redirect("/setup");
  else if (!shopifyStore) return { isSetup: false, shopifyStore, shopInfo };
  // -----------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------

  // -----------------------------------------------------------------------------------------
  // -----------------------------------------------------------------------------------------
  // Check if the app is setup
  const { status } = shopifyStore;

  const isSetup = status === "SETUP";

  if (!isSetup && shouldRedirect) throw redirect("/setup");

  return { isSetup, shopifyStore, shopInfo };
}
