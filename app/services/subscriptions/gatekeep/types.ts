import type { APP } from "app/constants/app.constants";
import type { Jsonify } from "app/types/utility/remix";
import type db from "app/db.server";
import type { Prisma } from "@prisma/client";

// --------------------------------------------------------------------
// Codes for the different gatekeep scenarios
// --------------------------------------------------------------------

// (SP) Shopify Plus
// Use this code to redirect when the user requires a Shopify Plus plan
type ShopifyPlusCode = "SP001";

// (AP) App Plan
// Use this code to redirect when the user requires an App plan
type AppPlanCode =
  | "AP001"
  | "AP002"
  | "AP003"
  | "AP004"
  | "AP005"
  | "AP006"
  | "AP007"
  | "AP008"
  | "AP009"
  | "AP010"
  | "AP011"
  | "AP012"
  | "AP013"
  | "AP014"
  | "AP015"
  | "AP016";

// (DP) Developer Preview
// Use this code to redirect when the user cannot access when the store is in Developer Preview
type NoDeveloperPreviewCode = "DP001";

// (NS) No-Store
// Use this code to redirect when there's an error while trying to access shopInfo and the route require this information.
type NoStoreCode = "NS001";

// (TP) Not Supported Third Party Carrier Rate
// Use this code to redirect when there's an error while trying to access third-party carrier rates
type NotSupportedThirdPartyCarrierRate = "SF002";

export type GateKeepCode =
  | ShopifyPlusCode
  | AppPlanCode
  | NoDeveloperPreviewCode
  | NoStoreCode
  | NotSupportedThirdPartyCarrierRate;

// --------------------------------------------------------------------
// Gatekeep function arguments
// --------------------------------------------------------------------

export type GateKeepArgs = {
  current: {
    shop: string;
    shopPlan: string;
    isDevStore: boolean;
    subscription: RichShopifySubscription | Jsonify<RichShopifySubscription>;
  } & OptionalCurrentGatekeepContext;
  criteria: GateKeepCriteria;
};

export type GateKeepCriteria = {
  /** Whether or not to gatekeep the feature if the store is a Devstore */
  gatekeepDevStore?: boolean;
  /** Whether or not to gatekeep the feature if the store is not under a specific App Plan, or one above in level */
  appPlan?: (typeof APP.PLANS)[number];
  /** Whether or not to gatekeep the feature if the store is not under a specific Shopify Plan, or one above in level */
  shopPlan?: (typeof APP.SHOPIFY_PLANS)[number];
} & Partial<SubscriptionCriteria>;

type SubscriptionCriteria = Omit<
  RichRecurringPlan,
  | "createdAt"
  | "updatedAt"
  | "hashID"
  | "name"
  | AmountBasedSubscriptionCriteriaKey
>;
export type OptionalCurrentGatekeepContext = AmountBasedSubscriptionCurrent; // & ... & ... Others in the future

type AmountBasedSubscriptionCurrent = {
  [K in AmountBasedSubscriptionCriteriaKey]?: number | null | undefined;
};

type AmountBasedSubscriptionCriteriaKey = keyof {
  [K in keyof RichRecurringPlan as K extends `amount${string}`
    ? K
    : never]: RichRecurringPlan[K];
};

type RichRecurringPlan = NonNullable<RichShopifySubscription["recurringPlan"]>;

export type RichShopifySubscription = NonNullable<
  ShopifySubscriptionAppGetPayload<{
    omit: {
      id: true;
      recurringPlanId: true;
      unstable_usagePlanId: true;
      shopifyRecurringPricingId: true;
      unstable_shopifyUsagePricingId: true;
    };
    include: {
      recurringPlan: { omit: { id: true } };
      shopifyRecurringPricing: { omit: { id: true } };

      // Unstable for now, only use in development
      // unstable_usagePlan: true;
      // unstable_shopifyUsagePricing: true;
    };
  }>
>;

export type ShopifySubscriptionAppGetPayload<T extends GetAppModelPayloadArgs<typeof db.shopifySubscription.findFirst>> = GetAppModelPayloadResult<typeof db.shopifySubscription, T>; /* eslint-disable-line max-len */ // prettier-ignore

type GetAppModelPayloadArgs<T extends (...args: any) => any = any> = Pick<
  NonNullable<Parameters<T>[0]>,
  "select" | "omit" | "include"
>;

type GetAppModelPayloadResult<
  T,
  U extends GetAppModelPayloadArgs,
> = NonNullable<Prisma.Result<T, U, "findFirst">>; //
