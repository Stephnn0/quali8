import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { GRAPHQL_MUTATION_CREATE_DISCOUNT } from "../graphql/discounts";

export async function createShippingDiscount(
  graphql: AdminGraphqlClient,
  code: string,
  body: string,
) {
  try {
    const VARIABLES = {
      functionId: "20b50cf7-29a2-4a71-8e85-e985fc3de5b8",
      title: code,
      startsAt: "2025-04-07",
      code: code,
      metafields: {
        key: "app_discount",
        value: body,
        type: "string",
      },
    };

    const response = await graphql(GRAPHQL_MUTATION_CREATE_DISCOUNT, {
      variables: VARIABLES,
    });

    const { data: adminData } = await response.json();

    return adminData;
  } catch (error) {
    console.log(error);
  }
}
