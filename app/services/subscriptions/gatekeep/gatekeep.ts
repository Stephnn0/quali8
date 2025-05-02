import { APP } from "app/constants/app.constants";
import type { GateKeepArgs, GateKeepCode } from "./types";
import { APP_PLANS_MAP, SHOP_PLANS_MAP } from "./plansMap";

export function gatekeep({
  criteria,
  current,
}: GateKeepArgs): GateKeepCode | null {
  // The order of the checks is important, as we want to check the most restrictive criteria first

  // TODO - Add a debug constant to optionally bypass all gatekeeps under node env === 'development'

  // ⚙️ 1️ Gatekeep criteria for Devstore is stablished:
  // then, we check if the current store is a Devstore
  if (criteria.gatekeepDevStore && current.isDevStore) {
    // ⚙️ 1️ - A - If the store's identifier is in the whitelist, we don't gatekeep
    if (!isStoreInWhitelist(current.shop)) return "DP001";
  }

  // ⚙️ 2️ -  Gatekeep criteria for App Plan is stablished:
  // then, we check if the current store has the required App Plan (or one above)
  if (criteria.appPlan) {
    if (!storeMeetsAppPlanCriteria(current.subscription, criteria.appPlan))
      return "AP001";
  }

  // ⚙️ 3 - Gatekeep criteria for Subscription Plan Details:
  // then, we check additional subscription details such as recurring plan code, interval, pricing,
  // feature access, and API permissions. If any of these conditions are not met, we gatekeep.
  const { recurringPlan, shopifyRecurringPricing } = current.subscription;

  if (criteria.code) {
    if (criteria.code !== recurringPlan?.code) return "AP002";
  }

  if (criteria.interval) {
    if (criteria.interval !== recurringPlan?.interval) return "AP003";
  }

  if (criteria.price != null) {
    const paidPrice =
      shopifyRecurringPricing?.discountPriceAfter ??
      shopifyRecurringPricing?.price;
    if (criteria.price !== paidPrice) return "AP004";
  }

  if (criteria.level) {
    if (criteria.level !== recurringPlan?.level) return "AP005";
  }

  if (criteria.trialDays) {
    throw new Error("Not implemented yet");
  }

  if (criteria.hasQualifiers) {
    if (!recurringPlan?.hasQualifiers) return "AP006";
  }

  if (criteria.hasShippingDiscounts) {
    if (!recurringPlan?.hasShippingDiscounts) return "AP007";
  }

  // ⚙️ 4 - Before checking the Shopify Plan, we check if the store is a DevStore
  // if it is, we don't gatekeep, as they can only reach this step if a Devstore is allowed (see 1)
  if (current.isDevStore) return null;

  // ⚙️ 5 - Gatekeep criteria for Shopify Plan is stablished:
  // then, we check if the current store has the required Shopify Plan (or one above)
  if (criteria.shopPlan) {
    if (!storeMeetsShopPlanCriteria(criteria.shopPlan, current.shopPlan))
      return "SP001";
  }

  // ⚙️ Finally, if the store meets all the criteria, we don't gatekeep
  return null;
}

// -------------------------------------------------------
// *  Helper functions
// -------------------------------------------------------

const isStoreInWhitelist = (shop: string = "") =>
  APP.STORES_WHITELIST.includes(shop);

const storeMeetsAppPlanCriteria = (
  subscription: GateKeepArgs["current"]["subscription"],
  appPlan: NonNullable<GateKeepArgs["criteria"]["appPlan"]>,
) =>
  subscription?.status === "ACTIVE" &&
  APP_PLANS_MAP[
    subscription.recurringPlan?.name as keyof typeof APP_PLANS_MAP
  ] >= APP_PLANS_MAP[appPlan];

const storeMeetsShopPlanCriteria = (
  shopPlan: NonNullable<GateKeepArgs["criteria"]["shopPlan"]>,
  currentShopPlan: GateKeepArgs["current"]["shopPlan"],
) =>
  SHOP_PLANS_MAP[currentShopPlan as keyof typeof SHOP_PLANS_MAP] >=
  SHOP_PLANS_MAP[shopPlan];
