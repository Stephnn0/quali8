import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { SHOP_METAFIELD_CONSTANTS } from "./contants";
import { GRAPHQL_QUERY_APP_ID_AND_SHOP_ID_WITH_METAFIELDS } from "app/models/shopify.server/graphql/app";

/**
 * Fetch the app and shop data with shop metafields.
 *
 * @param graphql - The Shopify admin graphql client
 * @returns The app and shop data
 */
export async function fetchShopMetafieldsData(graphql: AdminGraphqlClient) {
  const METAFIELDS_QUERY_VARIABLES = {
    namespace: SHOP_METAFIELD_CONSTANTS.namespace,
    ownerType: SHOP_METAFIELD_CONSTANTS.ownerType,
  };

  const appAndShopDataRes = await graphql(
    GRAPHQL_QUERY_APP_ID_AND_SHOP_ID_WITH_METAFIELDS,
    {
      variables: METAFIELDS_QUERY_VARIABLES,
    },
  );

  const { data: appAndShopData } = await appAndShopDataRes.json();

  return appAndShopData;
}

export type ShopMetafieldsData = Awaited<
  ReturnType<typeof fetchShopMetafieldsData>
>;
