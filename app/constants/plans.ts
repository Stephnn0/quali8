export const APP_PLANS = {
  FREE: {
    price: 0,
    name: "Free",
    level: "FREE",
    trialDays: null,
    // Check for when importing in the client
    shopifyPlanID:
      typeof process !== "undefined" ? process.env.SHOPIFY_FREE_PLAN_ID : "",

    hasQualifiers: true,
    hasShippingDiscounts: false,
  },

  BASIC: {
    name: "Basic",
    level: "BASIC",
    trialDays: 5,

    // Check for when importing in the client
    shopifyPlanID:
      typeof process !== "undefined" ? process.env.SHOPIFY_BASIC_PLAN_ID : "",

    hasQualifiers: true,
    hasShippingDiscounts: true,
  },
} as const;

// For when we need a dummy subscription to represent a free plan in case the user is not subscribed or the subscription is not found
export const FREE_DUMMY_SUBSCRIPTION = {
  cancelMethod: null,
  createdAt: new Date(),
  currentPeriodEnd: new Date(),
  hashID: "dummy-hash-id",
  id: -1,
  name: APP_PLANS.FREE.name,
  recurringPlanId: -1,
  recurringPlan: {
    ...APP_PLANS.FREE,
    id: -1,
    code: "free-monthly",
    hashID: "dummy-hash-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    interval: "EVERY_30_DAYS",
  },
  shop: "dummy-shop",
  shopifyId: "dummy-shopify-id",
  status: "ACTIVE",
  shopifyRecurringPricing: null,
  shopifyRecurringPricingId: null,
  startDate: new Date(),
  test: false,
  trialDays: null,
  unstable_shopifyUsagePricingId: null,
  unstable_usagePlanId: null,
  updatedAt: new Date(),
} as const;
