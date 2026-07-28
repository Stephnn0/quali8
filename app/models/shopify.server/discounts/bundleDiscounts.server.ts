import { createAdminApiClient } from "@shopify/admin-api-client";
import { APP } from "app/constants/app.constants";
import {
  GRAPHQL_MUTATION_CREATE_BUNDLE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_DELETE_BUNDLE_AUTOMATIC_DISCOUNT,
  GRAPHQL_MUTATION_SET_BUNDLE_DISCOUNT_METAFIELD,
} from "../graphql/bundleDiscounts";

/**
 * Admin API access for the shop's single bundle automatic discount.
 *
 * Runs on a raw admin client pinned to 2026-04 (the api_version of
 * extensions/bundle-discounts) because the app's default client pins
 * January25, which predates `discountClasses`/`functionHandle`. Same pattern
 * as `app/models/shopify.server/app/index.ts`.
 */

const BUNDLE_DISCOUNT_API_VERSION = "2026-04";

export type AdminCredentials = {
  shop: string;
  accessToken: string;
};

function bundleDiscountClient({ shop, accessToken }: AdminCredentials) {
  return createAdminApiClient({
    apiVersion: BUNDLE_DISCOUNT_API_VERSION,
    storeDomain: shop,
    accessToken,
  });
}

/** Creates the discount with its config metafield; returns the discount GID. */
export async function createBundleAutomaticDiscount(
  credentials: AdminCredentials,
  configValue: string,
): Promise<string> {
  const client = bundleDiscountClient(credentials);

  const response = await client.request(
    GRAPHQL_MUTATION_CREATE_BUNDLE_AUTOMATIC_DISCOUNT,
    {
      variables: {
        functionHandle: APP.BUNDLE_FUNCTION_HANDLE,
        title: APP.BUNDLE_DISCOUNT_TITLE,
        startsAt: new Date().toISOString(),
        metafields: [
          {
            key: APP.BUNDLE_METAFIELD_KEY,
            type: "json",
            value: configValue,
          },
        ],
      },
    },
  );

  const payload = response.data?.discountAutomaticAppCreate;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      `Could not create the bundle discount: ${userErrors
        .map((error: { message: string }) => error.message)
        .join("; ")}`,
    );
  }

  const discountId = payload?.automaticAppDiscount?.discountId;
  if (!discountId) {
    throw new Error(
      "Could not create the bundle discount: Shopify returned no discount id. " +
        "Make sure the bundle-discounts extension is deployed (npm run deploy).",
    );
  }

  return discountId;
}

/**
 * Rewrites the config metafield on an existing discount. Returns false when
 * the write failed (typically because the merchant deleted the discount in
 * the Shopify admin) so the caller can recreate it.
 */
export async function setBundleDiscountMetafield(
  credentials: AdminCredentials,
  discountId: string,
  configValue: string,
): Promise<boolean> {
  const client = bundleDiscountClient(credentials);

  const response = await client.request(
    GRAPHQL_MUTATION_SET_BUNDLE_DISCOUNT_METAFIELD,
    {
      variables: {
        metafields: [
          {
            ownerId: discountId,
            key: APP.BUNDLE_METAFIELD_KEY,
            type: "json",
            value: configValue,
          },
        ],
      },
    },
  );

  const userErrors = response.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length > 0) {
    console.error("bundle discount metafieldsSet failed:", userErrors);
    return false;
  }

  return true;
}

/** Deletes the discount; a discount that's already gone is not an error. */
export async function deleteBundleAutomaticDiscount(
  credentials: AdminCredentials,
  discountId: string,
): Promise<void> {
  const client = bundleDiscountClient(credentials);

  const response = await client.request(
    GRAPHQL_MUTATION_DELETE_BUNDLE_AUTOMATIC_DISCOUNT,
    { variables: { id: discountId } },
  );

  const userErrors = response.data?.discountAutomaticDelete?.userErrors ?? [];
  if (userErrors.length > 0) {
    // Deleting an already-deleted discount just means we're in sync.
    console.warn("bundle discount delete reported errors:", userErrors);
  }
}
