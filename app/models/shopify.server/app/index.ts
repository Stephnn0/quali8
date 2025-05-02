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

    const data = await response.json();

    return data.data?.currentAppInstallation?.activeSubscriptions;
  } catch (error) {
    console.error(
      "Error fetching active subscriptions:",
      error,
    ); /* eslint-disable-line no-console */
  }

  return null;
}

export const appModel = {
  findActiveSubscriptions,
};
