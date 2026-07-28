import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  GRAPHQL_MUTATION_CREATE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_CREATE_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_CODE_DISCOUNT,
} from "../graphql/discounts";
import { APP } from "app/constants/app.constants";
import db from "app/db.server";
import { getShopifyStore } from "app/models/app.server/shopifyStore/shopifyStore.server";

type CreateAutomaticShippingDiscountParams = {
  graphql: AdminGraphqlClient;
  title: string;
  body: string;
  startDate: string;
  endDate: string;
  shippingDiscountState: "ENABLED" | "DISABLED";
  combinedWithOrderDiscounts: boolean;
  combinedWithProductDiscounts: boolean;
  shop: string;
};

export async function createShippingAutomaticDiscount({
  graphql,
  title,
  body,
  startDate,
  endDate,
  shippingDiscountState,
  combinedWithOrderDiscounts,
  combinedWithProductDiscounts,
  shop,
}: CreateAutomaticShippingDiscountParams) {
  try {
    const shopifyStore = await getShopifyStore(
      {
        where: {
          shop: shop,
        },
      },
      db,
    );

    if (!shopifyStore?.functionId) throw new Error("Function ID not found");

    const VARIABLES = {
      functionId: shopifyStore?.functionId,
      title: title,
      startsAt: startDate,
      endsAt: endDate,
      // The mutation declares these as flat variables, not a combinesWith object
      orderDiscounts: combinedWithOrderDiscounts,
      productDiscounts: combinedWithProductDiscounts,
      shippingDiscounts: false,
      metafields: {
        key: APP.FUNCTION_METAFIELD_KEY,
        value: body,
        // "string" is a legacy metafield type Shopify rejects on current API
        // versions; the value is JSON and the function JSON.parses it
        type: "json",
      },
    };

    const response = await graphql(GRAPHQL_MUTATION_CREATE_AUTOMATIC_DISCOUNT, {
      variables: VARIABLES,
    });

    const { data: adminData } = await response.json();

    const payload = adminData?.discountAutomaticAppCreate;
    if (payload?.userErrors?.length) {
      throw new Error(
        `Could not create the automatic shipping discount: ${payload.userErrors
          .map((userError) => userError.message)
          .join("; ")}`,
      );
    }
    if (!payload?.automaticAppDiscount?.discountId) {
      throw new Error(
        "Could not create the automatic shipping discount: Shopify returned no discount id",
      );
    }

    return adminData;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

type CreateShippingDiscountParams = {
  graphql: AdminGraphqlClient;
  code: string;
  body: string;
  startDate: string;
  endDate: string;
  shippingDiscountState: "ENABLED" | "DISABLED";
  limitUsagePerOneCustomer: boolean;
  combinedWithOrderDiscounts: boolean;
  combinedWithProductDiscounts: boolean;
  shop: string;
};

export async function createShippingDiscount({
  graphql,
  code,
  body,
  startDate, // 2019-09-07T15:50:00Z 2025-05-02T17:09:21Z
  endDate,
  shippingDiscountState,
  limitUsagePerOneCustomer,
  combinedWithOrderDiscounts,
  combinedWithProductDiscounts,
  shop,
}: CreateShippingDiscountParams) {
  try {
    const shopifyStore = await getShopifyStore(
      {
        where: {
          shop: shop,
        },
      },
      db,
    );

    if (!shopifyStore?.functionId) throw new Error("Function ID not found");

    const VARIABLES = {
      functionId: shopifyStore?.functionId,
      title: code,
      startsAt: startDate,
      endsAt: endDate,
      code: code,
      // The mutation declares these as flat variables, not a combinesWith object
      orderDiscounts: combinedWithOrderDiscounts,
      productDiscounts: combinedWithProductDiscounts,
      shippingDiscounts: false,
      appliesOncePerCustomer: limitUsagePerOneCustomer,
      metafields: {
        key: APP.FUNCTION_METAFIELD_KEY,
        value: body,
        // "string" is a legacy metafield type Shopify rejects on current API
        // versions; the value is JSON and the function JSON.parses it
        type: "json",
      },
    };

    const response = await graphql(GRAPHQL_MUTATION_CREATE_DISCOUNT, {
      variables: VARIABLES,
    });

    const { data: adminData } = await response.json();

    const payload = adminData?.discountCodeAppCreate;
    if (payload?.userErrors?.length) {
      throw new Error(
        `Could not create the shipping discount code: ${payload.userErrors
          .map((userError) => userError.message)
          .join("; ")}`,
      );
    }
    if (!payload?.codeAppDiscount?.discountId) {
      throw new Error(
        "Could not create the shipping discount code: Shopify returned no discount id",
      );
    }

    return adminData;
  } catch (error) {
    console.log(error);
    throw error;
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
    throw error;
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
    throw error;
  }
}

// export async function updateShippingCodeDiscount(
//   graphql: AdminGraphqlClient,
//   discountId: string,
//   //
//   metafieldData: string,
//   title: string,
//   startsAt: string,
//   code: string,
// ) {
//   try {
//     const VARIABLES = {
//       ID: discountId,
//       functionId: "92f98185-5407-46c4-85d9-11594cc32d07",
//       title: title,
//       startsAt: startsAt,
//       code: code,
//       metafields: {
//         key: "quali8_shipping_discounts",
//         value: metafieldData,
//         type: "string",
//       },
//     };

//     const response = await graphql(GRAPHQL_MUTATION_CODE_UPDATE_DISCOUNT, {
//       variables: VARIABLES,
//     });

//     const { data: adminData } = await response.json();

//     return adminData;
//   } catch (error) {
//     console.log(error);
//   }
// }

// export async function updateShippingAutomaticDiscount(
//   graphql: AdminGraphqlClient,
//   discountId: string,
// ) {
//   try {
//     const VARIABLES = {
//       ID: discountId,
//       codeAppDiscount: {
//         title: "Updated Discount Title",
//         startsAt: "2025-04-07",
//         endsAt: "2025-05-07",
//         status: "ACTIVE",
//       },
//     };

//     const response = await graphql(GRAPHQL_MUTATION_UPDATE_AUTOMATIC_DISCOUNT, {
//       variables: VARIABLES,
//     });

//     const { data: adminData } = await response.json();

//     return adminData;
//   } catch (error) {
//     console.log(error);
//   }
// }

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
