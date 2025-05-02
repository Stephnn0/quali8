import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AppShopifySubscriptionFindFirstArgs,
  AppShopifySubscriptionFindManyArgs,
  AppShopifySubscriptionUpsertArgs,
} from "./types";
import type { AuthAdminContext } from "app/types/utility/shopify";
import type { FirstParam } from "app/types/utility/extendedTypescript";
import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { getShopID } from "app/models/shopify.server/shop/shop.server";
import { encodeGlobalID } from "app/utils/shopify";
import { APP_PLANS } from "app/constants/plans";
import { setAppSubscriptionMetafield } from "app/services/setup/metafields/setupAppSubscriptionMetafield/set";

/**
 * Find a ShopifySubscription object in the database.
 *
 * @param db - The prisma client
 * @param prismaArgs - The prisma arguments to find a ShopifySubscription
 * @returns shopifySubscription | null - The found ShopifySubscription or null if an error occurred
 */
async function find<T extends AppShopifySubscriptionFindFirstArgs>(
  db: PrismaClient,
  prismaArgs: T,
) {
  try {
    const subscriptions = await db.shopifySubscription.findFirst(prismaArgs);

    return subscriptions as Prisma.Result<
      typeof db.shopifySubscription,
      T,
      "findFirst"
    >;
  } catch (error) {
    console.error("Error finding ShopifySubscription:", error);
  }

  return null;
}

/**
 * Find many ShopifySubscription objects in the database.
 *
 * @param db - The prisma client
 * @param prismaArgs - The prisma arguments to find many ShopifySubscriptions
 * @returns shopifySubscription[] | null - The found ShopifySubscriptions or null if an error occurred
 */
async function findMany<T extends AppShopifySubscriptionFindManyArgs>(
  db: PrismaClient,
  prismaArgs: T,
) {
  try {
    const subscriptions = await db.shopifySubscription.findMany(prismaArgs);

    return subscriptions as Prisma.Result<
      typeof db.shopifySubscription,
      T,
      "findMany"
    >;
  } catch (error) {
    console.error("Error finding many ShopifySubscriptions:", error);
    throw error; // Just for enhancing the returntype, as the above function will always throw
  }
}
/**
 * Upsert a ShopifySubscription object in the database.
 *
 * ! ⚠️ `Warning.` Raw queries using:
 * - prismaArgs.where.shop
 * - prismaArgs.where.shop_shopifyId.shop.
 *
 *  Only retreive these from auth methods, do not pass them directly from the client.
 *
 * @param db - The prisma client
 * @param graphql - The Shopify admin graphql client
 * @param prismaArgs - The prisma arguments to upsert a ShopifySubscription
 * @returns shopifySubscription | null - The upserted ShopifySubscription or null if an error occurred
 */

async function upsert<T extends AppShopifySubscriptionUpsertArgs>(
  db: PrismaClient | FirstParam<FirstParam<PrismaClient["$transaction"]>>,
  graphql: AdminGraphqlClient,
  prismaArgs: T,
) {
  try {
    // TODO - move to a validation function
    const { shop: $shop, shop_shopifyId } = prismaArgs.where; // eslint-disable-line @typescript-eslint/naming-convention
    const shop = typeof $shop === "string" ? $shop : shop_shopifyId?.shop;

    // Check that at least one of shop or shop_shopifyId is valid
    if (!shop) {
      throw new Error(
        "Either where.shop must be a literal string or where.shop_shopifyId must be provided to upsert a subscription",
      );
    }

    const runTransaction = async (
      tx: PrismaClient | FirstParam<FirstParam<PrismaClient["$transaction"]>>,
    ) => {
      //
      // * We lock the rows for the shop
      // This is to prevent starting from proceeding another transaction
      // Solving race conditions and ensuring the final metafield has the correct data
      // This happens usually during webhooks, where multiple requests are made at the same time

      await tx.$queryRaw`SELECT * FROM "ShopifySubscription" WHERE shop = ${shop} FOR UPDATE`;

      // We perform the desired upsert operation
      const upsertedSubscription =
        await tx.shopifySubscription.upsert(prismaArgs);

      // Query all the active subscriptions for the shop and the shopID
      const shopifyStore = await tx.shopifyStore.findUniqueOrThrow({
        where: { shop },
        select: {
          shopData: { select: { shopID: true } },

          shopifySubscriptions: {
            take: 1,
            where: { status: "ACTIVE" },
            include: {
              recurringPlan: true,
              shopifyRecurringPricing: true,

              // See billing.prisma as for unstable details
              // unstable_usagePlan: true,
              // unstable_shopifyUsagePricing: true,
            },
          },
        },
      });

      // just in case the shopID is not yet set in the DB
      const shopID = shopifyStore.shopData?.shopID
        ? encodeGlobalID("Shop", shopifyStore.shopData?.shopID)
        : await getShopID(graphql);
      if (!shopID) throw new Error("could not get shopID for the shop");

      const subscription = shopifyStore.shopifySubscriptions.find(Boolean);

      // Update the activeSubscription metafield for the shop
      await setAppSubscriptionMetafield(graphql, subscription || null, shopID);

      return upsertedSubscription;
    };

    let shopifySubscription;
    if ("$transaction" in db) {
      shopifySubscription = await db.$transaction(runTransaction);
    } else {
      shopifySubscription = await runTransaction(db);
    }

    return shopifySubscription as Prisma.Result<
      typeof db.shopifySubscription,
      T,
      "upsert"
    >;
  } catch (error) {
    console.error("Error upserting ShopifySubscription:", error);
    throw error; // Just for enhancing the returntype, as the above function will always throw
  }
}

// -------------------------------------------------------
// -------------------------------------------------------
// # --------------- Custom Models -----------------------
// -------------------------------------------------------
// -------------------------------------------------------

/**
 * Find an active subscription for a shop.
 *
 * If it doesn't find one, it will default to the general "Free plan.
 *
 * @param db - The prisma client
 * @param shop - The shop to find the active subscription
 * @returns shopifySubscription | null - The found ShopifySubscription or null if an error occurred
 */
export async function findActiveSubscription(
  db: PrismaClient,
  authAdminContext: AuthAdminContext,
) {
  try {
    const {
      session: { shop },
      admin: { graphql },
    } = authAdminContext;

    // Attempt to find the active subscription for the shop
    const subscription = await shopifySubscriptionModel.find(db, {
      where: { shop, status: "ACTIVE" },
      include: { recurringPlan: true, shopifyRecurringPricing: true },
    });

    if (subscription) return subscription;

    // If no active subscription was found, upsert a subscription for the free plan
    const freePlan = await shopifySubscriptionModel.upsert(db, graphql, {
      create: {
        name: APP_PLANS.FREE.name,
        status: "ACTIVE",
        shopifyId: `manual-${Date.now()}`,

        shopifyStore: { connect: { shop } },

        recurringPlan: {
          connect: {
            shopifyPlanID_interval: {
              interval: "EVERY_30_DAYS",
              shopifyPlanID: APP_PLANS.FREE.shopifyPlanID ?? "",
            },
          },
        },
      },
      include: { recurringPlan: true, shopifyRecurringPricing: true },
      update: {},
      where: { shop, id: -1 }, // We are only interested in creating a new subscription.
    });

    return freePlan;
  } catch (error) {
    console.error("Error finding active subscription:", error);
    throw error; // Just for enhancing the returntype, as the above function will always throw
  }
}

export type ActiveSubscription = Awaited<
  ReturnType<typeof shopifySubscriptionModel.findActiveSubscription>
>;

export const shopifySubscriptionModel = {
  find,
  findMany,
  upsert,
  findActiveSubscription,
};
