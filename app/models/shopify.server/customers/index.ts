import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { GRAPHQL_QUERY_CUSTOMERS } from "../graphql/customers";

export async function getCustomers(graphql: AdminGraphqlClient, query = "") {
  console.log("--------------------hit-----------------------");
  try {
    const variables = {
      first: 50,
      query,
    };

    const response = await graphql(GRAPHQL_QUERY_CUSTOMERS, { variables });

    const data = await response.json();

    console.log("response", data);

    return data?.data?.customers.edges;
  } catch (error) {
    console.error("Error fetching customers:", error);
  }

  return null;
}
