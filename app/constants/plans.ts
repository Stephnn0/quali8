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
