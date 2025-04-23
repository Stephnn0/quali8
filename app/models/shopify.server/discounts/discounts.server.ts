import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import {
  GRAPHQL_MUTATION_CODE_UPDATE_DISCOUNT,
  GRAPHQL_MUTATION_CREATE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_CREATE_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_CODE_DISCOUNT,
  GRAPHQL_MUTATION_UPDATE_AUTOMATIC_DISCOUNT,
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

export async function updateShippingCodeDiscount(
  graphql: AdminGraphqlClient,
  discountId: string,
  //
  metafieldData: string,
  title: string,
  startsAt: string,
  code: string,
) {
  try {
    const VARIABLES = {
      ID: discountId,
      functionId: "92f98185-5407-46c4-85d9-11594cc32d07",
      title: title,
      startsAt: startsAt,
      code: code,
      metafields: {
        key: "quali8_shipping_discounts",
        value: metafieldData,
        type: "string",
      },
    };

    const response = await graphql(GRAPHQL_MUTATION_CODE_UPDATE_DISCOUNT, {
      variables: VARIABLES,
    });

    const { data: adminData } = await response.json();

    return adminData;
  } catch (error) {
    console.log(error);
  }
}

export async function updateShippingAutomaticDiscount(
  graphql: AdminGraphqlClient,
  discountId: string,
) {
  try {
    const VARIABLES = {
      ID: discountId,
      codeAppDiscount: {
        title: "Updated Discount Title",
        startsAt: "2025-04-07",
        endsAt: "2025-05-07",
        status: "ACTIVE",
      },
    };

    const response = await graphql(GRAPHQL_MUTATION_UPDATE_AUTOMATIC_DISCOUNT, {
      variables: VARIABLES,
    });

    const { data: adminData } = await response.json();

    return adminData;
  } catch (error) {
    console.log(error);
  }
}

// query {
//   discountNode(id:"gid://shopify/DiscountCodeNode/1493666660491" ){
//     metafields(first:20) {
//       edges {
//         node {
//           id
//           value
//         }
//       }
//     }
//   }
// }
