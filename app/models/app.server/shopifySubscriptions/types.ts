import type db from "app/db.server";
import type { FirstParam } from "app/types/utility/extendedTypescript";

export type AppShopifySubscriptionFindFirstArgs = FirstParam<
  typeof db.shopifySubscription.findFirst
>;
export type AppShopifySubscriptionFindManyArgs = FirstParam<
  typeof db.shopifySubscription.findMany
>;
export type AppShopifySubscriptionUpsertArgs = FirstParam<
  typeof db.shopifySubscription.upsert
>;
