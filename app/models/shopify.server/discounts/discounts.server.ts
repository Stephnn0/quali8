import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { createAdminApiClient } from "@shopify/admin-api-client";
import {
  GRAPHQL_MUTATION_CREATE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_CREATE_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_CODE_DISCOUNT,
} from "../graphql/discounts";
import { APP } from "app/constants/app.constants";

/**
 * The create mutations must run on the api_version of
 * extensions/shipping-discounts (2026-04): the function uses the modern
 * discounts API type, which requires `discountClasses` — a field the app's
 * default admin client (pinned January25) predates. Same pattern as
 * `bundleDiscounts.server.ts`.
 */
const SHIPPING_DISCOUNT_API_VERSION = "2026-04";

export type AdminCredentials = {
  shop: string;
  accessToken: string;
};

function shippingDiscountClient({ shop, accessToken }: AdminCredentials) {
  return createAdminApiClient({
    apiVersion: SHIPPING_DISCOUNT_API_VERSION,
    storeDomain: shop,
    accessToken,
  });
}

/**
 * Shopify reports a function/discount mismatch with messages that don't say
 * what to do about it. Both cases mean the *deployed* function version is out
 * of step with this app code — extensions only update via `npm run deploy`,
 * so deploying the web app alone (or deploying from a checkout that predates
 * the function migration) leaves the old function live.
 */
function explainFunctionVersionError(message: string): string {
  const staleFunction =
    message.includes("does not support shipping discounts") ||
    message.includes("require the discountClasses field");
  if (!staleFunction) return message;
  return (
    `${message} — the shipping-discounts function deployed to Shopify is ` +
    "an older version. Pull the latest main and run `npm run deploy` " +
    "(Shopify CLI) with the production app config to update it."
  );
}

type CreateAutomaticShippingDiscountParams = {
  credentials: AdminCredentials;
  title: string;
  body: string;
  startDate: string;
  endDate: string;
  shippingDiscountState: "ENABLED" | "DISABLED";
  combinedWithOrderDiscounts: boolean;
  combinedWithProductDiscounts: boolean;
};

export async function createShippingAutomaticDiscount({
  credentials,
  title,
  body,
  startDate,
  endDate,
  shippingDiscountState,
  combinedWithOrderDiscounts,
  combinedWithProductDiscounts,
}: CreateAutomaticShippingDiscountParams) {
  try {
    const VARIABLES = {
      // The stable extension handle — per-store function ids go stale when
      // the function's API type migrates (the id is snapshotted at install).
      functionHandle: APP.SHIPPING_FUNCTION_HANDLE,
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

    const client = shippingDiscountClient(credentials);
    const response = await client.request(
      GRAPHQL_MUTATION_CREATE_AUTOMATIC_DISCOUNT,
      { variables: VARIABLES },
    );

    if (response.errors) {
      const details =
        response.errors.graphQLErrors
          ?.map((graphQLError: { message: string }) => graphQLError.message)
          .join("; ") ?? response.errors.message;
      throw new Error(
        `Could not create the automatic shipping discount: ${details}`,
      );
    }

    const adminData = response.data;

    const payload = adminData?.discountAutomaticAppCreate;
    if (payload?.userErrors?.length) {
      throw new Error(
        `Could not create the automatic shipping discount: ${explainFunctionVersionError(
          payload.userErrors
            .map((userError: { message: string }) => userError.message)
            .join("; "),
        )}`,
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
  credentials: AdminCredentials;
  code: string;
  body: string;
  startDate: string;
  endDate: string;
  shippingDiscountState: "ENABLED" | "DISABLED";
  limitUsagePerOneCustomer: boolean;
  combinedWithOrderDiscounts: boolean;
  combinedWithProductDiscounts: boolean;
};

export async function createShippingDiscount({
  credentials,
  code,
  body,
  startDate, // 2019-09-07T15:50:00Z 2025-05-02T17:09:21Z
  endDate,
  shippingDiscountState,
  limitUsagePerOneCustomer,
  combinedWithOrderDiscounts,
  combinedWithProductDiscounts,
}: CreateShippingDiscountParams) {
  try {
    const VARIABLES = {
      // The stable extension handle — per-store function ids go stale when
      // the function's API type migrates (the id is snapshotted at install).
      functionHandle: APP.SHIPPING_FUNCTION_HANDLE,
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

    const client = shippingDiscountClient(credentials);
    const response = await client.request(GRAPHQL_MUTATION_CREATE_DISCOUNT, {
      variables: VARIABLES,
    });

    if (response.errors) {
      const details =
        response.errors.graphQLErrors
          ?.map((graphQLError: { message: string }) => graphQLError.message)
          .join("; ") ?? response.errors.message;
      throw new Error(
        `Could not create the shipping discount code: ${details}`,
      );
    }

    const adminData = response.data;

    const payload = adminData?.discountCodeAppCreate;
    if (payload?.userErrors?.length) {
      throw new Error(
        `Could not create the shipping discount code: ${explainFunctionVersionError(
          payload.userErrors
            .map((userError: { message: string }) => userError.message)
            .join("; "),
        )}`,
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
