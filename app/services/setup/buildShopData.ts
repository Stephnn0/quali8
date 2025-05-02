import type { Prisma, ShopifyStore } from "@prisma/client";
import type { SetupShopifyStoreParams } from "./setupShopifyStore";

export function decodeGlobalID(globalID: string): string {
  const parts = globalID.split("/");
  return parts[parts.length - 1];
}

export function buildShopData(
  shop: ShopifyStore["shop"],
  shopInfo: SetupShopifyStoreParams["shopInfo"],
) {
  const {
    shop: {
      id,
      email,
      ianaTimezone,
      currencyCode,
      shopOwnerName,
      plan: { displayName: shopifyPlan },
    },
  } = shopInfo;

  const createOrUpdateData: Prisma.ShopifyShopDataUpsertWithoutShopifyStoreInput["create"] =
    {
      shopID: BigInt(decodeGlobalID(id)),
      email,
      ianaTimezone,
      shopOwnerName,
      currency: currencyCode,
      planDisplayName: shopifyPlan,
    };

  const shopData: Prisma.ShopifyShopDataUpsertWithoutShopifyStoreInput = {
    where: { shop },
    create: createOrUpdateData,
    update: createOrUpdateData,
  };

  return shopData;
}
