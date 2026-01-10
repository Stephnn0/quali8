import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { GRAPHQL_QUERY_CUSTOMERS } from "../graphql/customers";

export async function getCustomers(graphql: AdminGraphqlClient, query = "") {
  try {
    const variables = {
      first: 50,
      query,
    };

    const response = await graphql(GRAPHQL_QUERY_CUSTOMERS, { variables });

    const data = await response.json();

    return data?.data?.customers.edges;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
}
