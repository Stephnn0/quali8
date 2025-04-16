import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { GRAPHQL_QUERY_CUSTOMERS } from "../graphql/customers";

export async function getCustomers(graphql: AdminGraphqlClient) {
  try {
    const variables = {
      first: 50,
    };

    const response = await graphql(GRAPHQL_QUERY_CUSTOMERS, { variables });

    const data = await response.json();

    console.log("customers", data?.data?.customers.edges);

    return data?.data?.customers.edges;
  } catch (error) {
    console.error("Error fetching customers:", error);
  }

  return null;
}
