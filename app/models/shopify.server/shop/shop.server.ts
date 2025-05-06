import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import {
  GRAPHQL_QUERY_SHOP_ID,
  GRAPHQL_QUERY_SHOP_INFO,
} from "../graphql/shop";
import type { ShopInfoQueryVariables } from "app/types/admin.generated";
import { APP } from "app/constants/app.constants";

export const APP_URL_METAFIELD = {
  key: "app_url",
  name: "App URL",
} as const;

export async function getShopInfo(graphql: AdminGraphqlClient) {
  try {
    const variables: ShopInfoQueryVariables = {
      appURLMetafieldKey: APP_URL_METAFIELD.key,
      appENVMetafieldNamespace: APP.METAFIELDS_NAMESPACES.ENV,
    };

    const response = await graphql(GRAPHQL_QUERY_SHOP_INFO, { variables });
    const data = await response.json();

    return data.data;
  } catch (error) {
    console.error("Error fetching shop info:", error);
    throw error;
  }
}

export async function getShopID(graphql: AdminGraphqlClient) {
  try {
    const response = await graphql(GRAPHQL_QUERY_SHOP_ID);
    const data = await response.json();

    return data.data?.shop.id;
  } catch (error) {
    console.error("Error fetching shop ID:", error);
    throw error;
  }
}
