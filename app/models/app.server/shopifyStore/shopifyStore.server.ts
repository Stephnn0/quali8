import type { Prisma, PrismaClient } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/binary";

export async function createShopifyStore(
  prismaArgs: Prisma.ShopifyStoreCreateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const shopifyStore = await db.shopifyStore.create(prismaArgs);

    return shopifyStore;
  } catch (error) {
    console.error("Error creating Shopify store:", error);
  }

  return null;
}

export async function updateShopifyStore(
  prismaArgs: Prisma.ShopifyStoreUpdateArgs<DefaultArgs>,
  db: PrismaClient,
) {
  try {
    const shopifyStore = await db.shopifyStore.update(prismaArgs);

    return shopifyStore;
  } catch (error) {
    console.error("Error creating Shopify store:", error);
  }

  return null;
}

export async function getShopifyStore(
  prismaArgs: Prisma.ShopifyStoreFindFirstArgs,
  db: PrismaClient,
) {
  try {
    const shopifyStore = await db.shopifyStore.findFirst(prismaArgs);

    return shopifyStore;
  } catch (error) {
    console.error("Error fetching Shopify store:", error);
  }

  return null;
}
