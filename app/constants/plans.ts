/** Bundles a Free shop can keep. */
export const FREE_BUNDLE_LIMIT = 1;
/** Popup signups a Free shop can collect per calendar month. */
export const FREE_POPUP_SIGNUP_LIMIT = 200;

export const APP_PLANS = {
  FREE: {
    price: 0,
    name: "Free",
    level: "FREE",
    // Managed-pricing plan handle in the Partner Dashboard. Unlike the
    // subscription name (localized) and shopifyPlanID (numeric id), the
    // handle is what AppRecurringPricing.planHandle returns at runtime.
    shopifyPlanHandle: "free",
    trialDays: null,
    // Check for when importing in the client
    shopifyPlanID:
      typeof process !== "undefined" ? process.env.SHOPIFY_FREE_PLAN_ID : "",

    hasQualifiers: true,
    hasShippingDiscounts: false,
    hasBundles: true,
    hasRecommendations: false,
    hasAssistant: false,
    hasAnnouncements: true,
    hasDeliveryZones: true,
    hasSubscribePopup: true,
    // Free is limited, not locked: one bundle and a monthly signup cap, so
    // merchants set things up first and hit the upgrade moment in the flow.
    bundleLimit: FREE_BUNDLE_LIMIT,
    popupSignupLimit: FREE_POPUP_SIGNUP_LIMIT,
  },

  // The only paid plan: every feature, including the AI assistant.
  // (The former mid tier "Pro" — level `BASIC`, handle `basic`, seed codes
  // `pro-monthly`/`pro-annual` — was retired; its enum value stays in the
  // Prisma schema only so historical subscription rows keep loading.)
  ADVANCE: {
    name: "Advance",
    level: "ADVANCE",
    // Managed-pricing handle in the Partner Dashboard
    shopifyPlanHandle: "advance",
    trialDays: 5,

    // Check for when importing in the client
    shopifyPlanID:
      typeof process !== "undefined" ? process.env.SHOPIFY_ADVANCE_PLAN_ID : "",

    hasQualifiers: true,
    hasShippingDiscounts: true,
    hasBundles: true,
    hasRecommendations: true,
    hasAssistant: true,
    hasAnnouncements: true,
    hasDeliveryZones: true,
    hasSubscribePopup: true,
    bundleLimit: null,
    popupSignupLimit: null,
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
