import {
  SubscriptionStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import type {
  AppShopifySubscriptionFindFirstArgs,
  AppShopifySubscriptionFindManyArgs,
  AppShopifySubscriptionUpsertArgs,
} from "./types";
import type {
  AuthAdminContext,
  AuthWebhookContext,
} from "app/types/utility/shopify";
import type { FirstParam } from "app/types/utility/extendedTypescript";
import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { getShopID } from "app/models/shopify.server/shop/shop.server";
import { encodeGlobalID } from "app/utils/shopify";
import { APP_PLANS } from "app/constants/plans";
import { setAppSubscriptionMetafield } from "app/services/setup/metafields/setupAppSubscriptionMetafield/set";
import type { appSubscriptionModel } from "app/models/shopify.server/appSubscription";
import {
  getDiscountAmount,
  getDiscountPercentage,
  getDiscountType,
  getRecurringPricing,
} from "./utils";
import { recurringPlanModel } from "app/models/shopify.server/recurringPlan";

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

async function findAllActiveSubscriptions(
  db: PrismaClient,
  shop: string,
): Promise<ActiveSubscription[]> {
  try {
    const activeSubscriptions = await shopifySubscriptionModel.findMany(db, {
      where: { shop, status: "ACTIVE" },
      include: { recurringPlan: true, shopifyRecurringPricing: true },
    });

    return activeSubscriptions;
  } catch (error) {
    console.error("Error finding all active subscriptions:", error);
    throw error; // Just for enhancing the returntype, as the above function will always throw
  }
}

/**
 * Sync a subscription with the database via a Shopify
 *
 * @param db - The PrismaClient instance
 * @param authContext - The context object containing the webhook or admin payload and other utilities.
 * @param subscription - The subscription object to upsert
 * @param processID - The process ID for logging - usually the webhook ID or an UUID if not in a webhook context
 * @returns void
 */
async function syncSubscription(
  db: PrismaClient,
  authContext: AuthWebhookContext | AuthAdminContext,
  subscription: NonNullable<
    Awaited<ReturnType<typeof appSubscriptionModel.find>>
  >,
  processID: string,
) {
  const { admin, session } = authContext || {};

  if (!admin)
    throw new Error(
      `${processID} - No admin context available for upserting subscription`,
    );

  // const usagePricing = getUsagePricing(richSubscription);
  const recurringPricing = getRecurringPricing(subscription);
  const discountAmount = getDiscountAmount(recurringPricing);
  const discountPercentage = getDiscountPercentage(recurringPricing);
  const discountType = getDiscountType(discountAmount, discountPercentage);

  // if (!recurringPricing || !usagePricing) throw new Error(`${processID} - No recurring pricing found in subscription`);
  if (!recurringPricing)
    throw new Error(
      `${processID} - No recurring pricing found in subscription`,
    );

  // ! WE ALWAYS OUR 4 GENERATED RECURRING PLANS HERE npx prisma db seed
  const recurringPlan = await recurringPlanModel.find(db, {
    omit: { id: false },
    where: {
      OR: [
        // ! SHOPIFY SUBSCRIPTION -> many [ USAGE PLAN ] -> one USAGE PRICING
        // ! SHOPIFY SUBSCRIPTION -> many [ RECURRING PLAN ] -> one RECURRING PRICING
        //
        // ! We find a recurring plan by the subscription name or planId
        // ! we need a unique identifier because if store is in spanish it returns the subscription name in spanish
        { name: subscription.name },
        { shopifyPlanID: recurringPricing.planId || "" },
      ],
      AND: { interval: recurringPricing.interval },
    },
  });

  // This can be commented out when we introduce usage-pricing only subscriptions
  if (!recurringPlan)
    throw new Error(`${processID} - No recurring plan found in subscription`);

  const createShopifyRecurringPricingInput =
    recurringPricing &&
    ({
      price: Number(recurringPricing?.price.amount),
      currencyCode: recurringPricing?.price.currencyCode,
      interval: recurringPricing?.interval,
      discountType,
      discount:
        Number(discountAmount?.amount) || Number(discountPercentage) || null,
      discountPriceAfter: Number(
        recurringPricing?.discount?.priceAfterDiscount.amount,
      ),
      discountCurrencyCode:
        recurringPricing?.discount?.priceAfterDiscount.currencyCode,
      discountDurationIntervals:
        recurringPricing?.discount?.durationLimitInIntervals,
      discountRemainingIntervals:
        recurringPricing?.discount?.remainingDurationInIntervals,
    } as const satisfies Prisma.ShopifyRecurringPricingCreateInput);

  // We do a find first here because we can't use optional field Null values (discountCurrencyCode) in the where clause of where in connectOrCreate
  // https://github.com/Brendonovich/prisma-client-rust/issues/62
  const shopifyRecurringPricing =
    createShopifyRecurringPricingInput &&
    (await db.shopifyRecurringPricing.findFirst({
      omit: { id: false },
      where: createShopifyRecurringPricingInput,
    }));

  const createSubscriptionInput = {
    shopifyId: subscription.id,
    name: subscription.name,
    startDate: subscription.createdAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    status: subscription.status,
    test: subscription.test,
    trialDays: subscription.trialDays,
    cancelMethod:
      subscription.status === SubscriptionStatus.CANCELLED
        ? "MANUAL"
        : undefined,

    shopifyStore: { connect: { shop: session.shop } },

    shopifyRecurringPricing: createShopifyRecurringPricingInput
      ? {
          connectOrCreate: {
            create: createShopifyRecurringPricingInput,
            where: { id: shopifyRecurringPricing?.id || -1 },
          },
        }
      : undefined,

    recurringPlan: recurringPlan
      ? { connect: { id: recurringPlan.id } }
      : undefined,

    // # Unstable for now, see billing.prisma
    // unstable_shopifyUsagePricing: {
    //   connectOrCreate: {
    //     where: {
    //       cappedAmount_currencyCode_interval_terms_balanceUsed_balanceCurrencyCode: {
    //         balanceCurrencyCode: usagePricing?.balanceUsed.currencyCode
    //       }
    //     }
    //   }
    // }
    //
  } as const satisfies Prisma.ShopifySubscriptionCreateInput;

  const sub = await db.$transaction(async (tx) => {
    // Cancel all active subscriptions for the shop, as we can only have one active subscription at a time

    if (createSubscriptionInput.status === "ACTIVE") {
      await tx.shopifySubscription.updateMany({
        where: { shop: session.shop, status: "ACTIVE" },
        data: {
          status: "CANCELLED",
          currentPeriodEnd: null,
          cancelMethod: "MANUAL",
        },
      });
    }

    // Upsert the subscription
    return shopifySubscriptionModel.upsert(tx, admin.graphql, {
      create: createSubscriptionInput,
      update: createSubscriptionInput,
      where: {
        shop_shopifyId: { shop: session.shop, shopifyId: subscription.id },
      },
      include: { recurringPlan: true, shopifyRecurringPricing: true },
    });
  });

  return sub;
}

// -------------------------------------------------------
// -------------------------------------------------------
// * ---------------  Final Export  ----------------------
// -------------------------------------------------------
// -------------------------------------------------------

export const shopifySubscriptionModel = {
  find,
  findMany,
  upsert,
  findActiveSubscription,
  findAllActiveSubscriptions,
  syncSubscription,
};
