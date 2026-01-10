import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { GRAPHQL_QUERY_SHOPIFY_FUNCTIONS } from "../graphql/functions";

type ShopifyFunctions = Awaited<ReturnType<typeof getShopifyFunctions>>;

export async function getShopifyFunctions(graphql: AdminGraphqlClient) {
  try {
    const variables = {
      first: 10,
    };

    const response = await graphql(GRAPHQL_QUERY_SHOPIFY_FUNCTIONS, {
      variables,
    });

    const data = await response.json();

    return data?.data?.shopifyFunctions.edges;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
}

export async function getFunctionId(
  functions: ShopifyFunctions,
  appHandle: string,
) {
  const matchedFunction = functions?.find(
    (f: any) => f.node.app?.handle === appHandle,
  );

  return matchedFunction?.node.id;
}
