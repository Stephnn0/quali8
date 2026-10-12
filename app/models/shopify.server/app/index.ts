import type {
  AuthAdminContext,
  AuthWebhookContext,
} from "app/types/utility/shopify";
import { createAdminApiClient } from "@shopify/admin-api-client";
import { UNSTABLE_GRAPHQL_QUERY_ACTIVE_SUBSCRIPTIONS } from "../graphql-unstable/app";

/**
 * Find the active subscriptions for the current app installation.
 *
 * @param graphql - The Shopify admin graphql client
 * @returns The active subscriptions or null if an error occurred
 */
async function findActiveSubscriptions(
  authContext: AuthAdminContext | AuthWebhookContext,
) {
  try {
    if (!authContext.session || !authContext.session.accessToken) {
      console.log("authContext"); /* eslint-disable-line no-console */
      console.log(authContext); /* eslint-disable-line no-console */
      throw new Error(
        "No session or accessToken available for this operation.",
      );
    }

    const client = createAdminApiClient({
      apiVersion: "unstable",
      storeDomain: authContext.session.shop,
      accessToken: authContext.session.accessToken,
    });

    const response = await client.fetch(
      UNSTABLE_GRAPHQL_QUERY_ACTIVE_SUBSCRIPTIONS,
    );

    if (!response.ok) {
      // A 401 here means the offline token expired (or was revoked); an
      // empty list would be read as "no subscription", which is wrong.
      throw new Error(
        `Shopify answered ${response.status} when reading the active subscriptions for ${authContext.session.shop}` +
          (response.status === 401 ? " (the offline access token is no longer valid)" : ""),
      );
    }

    const data = await response.json();
    if (data.errors?.length) {
      throw new Error(
        `Shopify rejected the active subscriptions query: ${data.errors.map((e: { message: string }) => e.message).join("; ")}`,
      );
    }

    return data.data?.currentAppInstallation?.activeSubscriptions;
  } catch (error) {
    console.error(
      "Error fetching active subscriptions:",
      error,
    ); /* eslint-disable-line no-console */
    throw error;
  }

  return null;
}

export const appModel = {
  findActiveSubscriptions,
};
