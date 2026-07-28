import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  GRAPHQL_QUERY_CUSTOMERS,
  GRAPHQL_QUERY_CUSTOMER_INSIGHTS,
} from "../graphql/customers";

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

export type CustomerInsightsSample = {
  totalCustomers: number;
  customers: Array<{
    id: string;
    createdAt: string;
    numberOfOrders: number;
    amountSpent: number;
    country: string | null;
  }>;
};

/** Most recent customers + total count, for the analytics section. */
export async function getCustomerInsightsSample(
  graphql: AdminGraphqlClient,
  first = 250,
): Promise<CustomerInsightsSample> {
  const response = await graphql(GRAPHQL_QUERY_CUSTOMER_INSIGHTS, {
    variables: { first },
  });

  const { data } = await response.json();

  type InsightsEdge = {
    node: {
      id: string;
      createdAt: string;
      numberOfOrders?: string | number | null;
      amountSpent?: { amount?: string | null } | null;
      defaultAddress?: { country?: string | null } | null;
    };
  };

  const edges = (data?.customers.edges ?? []) as InsightsEdge[];
  const customers = edges.map(({ node }) => ({
    id: node.id,
    createdAt: node.createdAt as string,
    numberOfOrders: Number(node.numberOfOrders ?? 0),
    amountSpent: Number.parseFloat(node.amountSpent?.amount ?? "0") || 0,
    country: node.defaultAddress?.country ?? null,
  }));

  return {
    totalCustomers: data?.customersCount?.count ?? customers.length,
    customers,
  };
}
