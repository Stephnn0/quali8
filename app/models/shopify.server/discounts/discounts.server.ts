import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import {
  GRAPHQL_MUTATION_CREATE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_CREATE_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_CODE_DISCOUNT,
} from "../graphql/discounts";

export async function createShippingAutomaticDiscount(
  graphql: AdminGraphqlClient,
  title: string,
  metafieldData: string,
  functionId: string,
  startDate: string,
  endsAt: string,
  usageLimit: number,
  appliesOncePerCustomer: boolean,
) {
  try {
    const VARIABLES = {
      functionId: functionId,
      title: title,
      startsAt: startDate,
      endsAt: endsAt,
      metafields: {
        key: "quali8_shipping_discounts",
        value: metafieldData,
        type: "string",
      },
    };

    const response = await graphql(GRAPHQL_MUTATION_CREATE_AUTOMATIC_DISCOUNT, {
      variables: VARIABLES,
    });

    const { data: adminData } = await response.json();

    return adminData;
  } catch (error) {
    console.log(error);
  }
}

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

export async function deleteShippingCodeDiscount(
  graphql: AdminGraphqlClient,
  discountId: string,
) {
  try {
    const VARIABLES = {
      ID: discountId,
    };

    const response = await graphql(GRAPHQL_MUTATION_DELETE_CODE_DISCOUNT, {
      variables: VARIABLES,
    });

    const { data: adminData } = await response.json();

    return adminData;
  } catch (error) {
    console.log(error);
  }
}

export async function deleteShippingAutomaticDiscount(
  graphql: AdminGraphqlClient,
  discountId: string,
) {
  try {
    const VARIABLES = {
      ID: discountId,
    };

    const response = await graphql(GRAPHQL_MUTATION_DELETE_AUTOMATIC_DISCOUNT, {
      variables: VARIABLES,
    });

    const { data: adminData } = await response.json();

    return adminData;
  } catch (error) {
    console.log(error);
  }
}
