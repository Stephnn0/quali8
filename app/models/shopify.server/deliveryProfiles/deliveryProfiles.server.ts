import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { GRAPHQL_QUERY_DELIVERY_PROFILES } from "../graphql/deliveryProfiles";

export async function getDeliveryProfiles(graphql: AdminGraphqlClient) {
  const variables = {
    first: 100,
  };

  const res = await graphql(GRAPHQL_QUERY_DELIVERY_PROFILES, { variables });

  const { data } = await res.json();

  return data?.deliveryProfiles;
}
