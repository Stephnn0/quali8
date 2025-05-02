import { METAFIELD } from "app/models/shopify.server/graphql/metafield";
import { SHOP_METAFIELD_CONSTANTS } from "../contants";

export const APP_SUBSCRIPTION_METAFIELD = {
  ...SHOP_METAFIELD_CONSTANTS,

  key: "app_subscription",
  name: "App Subscription",
  type: METAFIELD.type.json,
} as const;
