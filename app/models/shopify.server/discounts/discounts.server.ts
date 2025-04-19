import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { GRAPHQL_MUTATION_CREATE_DISCOUNT } from "../graphql/discounts";

export async function createShippingDiscount(
  graphql: AdminGraphqlClient,
  code: string,
  body: string,
) {
  try {
    const VARIABLES = {
      functionId: "92f98185-5407-46c4-85d9-11594cc32d07",
      title: code,
      startsAt: "2025-04-07",
      code: code,
      metafields: {
        key: "quali8_shipping_discounts",
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
