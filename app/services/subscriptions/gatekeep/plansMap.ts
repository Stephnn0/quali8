import type { APP } from "app/constants/app.constants";
import { APP_PLANS } from "app/constants/plans";

/**
 * Plans for Shopify stores, ordered from the lowest to the highest.
 * This is used to compare the current store's plan with the required plan incrementally.
 *
 * You can then compare the current store's plan with the required plan by using the following:
 * @example
 * ```ts
 * const currentPlan = shopPlans[currentShopPlan];
 * const requiredPlan = shopPlans[requiredShopPlan];
 *
 * if (currentPlan < requiredPlan) {
 *  // The store does not meet the required plan
 * }
 *```
 */
export const SHOP_PLANS_MAP: Record<
  (typeof APP.SHOPIFY_PLANS)[number],
  number
> = {
  "Basic Shopify": 0,
  Shopify: 1,
  "Advanced Shopify": 2,
  "Shopify Plus": 3,
} as const;

/**
 * Plans for the app, ordered from the lowest to the highest.
 * This is used to compare the current store's plan with the required plan incrementally.
 *
 * You can then compare the current store's plan with the required plan by using the following:
 * @example
 * ```ts
 * const currentPlan = appPlans[currentShopPlan];
 * const requiredPlan = appPlans[requiredShopPlan];
 *
 * if (currentPlan <= requiredPlan) {
 * // The store does not meet the required plan
 * }
 * ```
 */
export const APP_PLANS_MAP: Record<(typeof APP.PLANS)[number], number> = {
  [APP_PLANS.FREE.name]: 0,
  [APP_PLANS.ADVANCE.name]: 1,
} as const;
