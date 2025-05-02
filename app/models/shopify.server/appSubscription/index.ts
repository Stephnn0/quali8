import type {
  AuthAdminContext,
  AuthWebhookContext,
} from "app/types/utility/shopify";
import { UNSTABLE_GRAPHQL_QUERY_APP_SUBSCRIPTION_BY_ID } from "../graphql-unstable/appSubscription";
import type { UnstableAppSubscriptionByIdQueryVariables } from "app/types/admin.generated";
import { createAdminApiClient } from "@shopify/admin-api-client";

/**
 * Find an app subscription by ID.
 *
 * @param graphql - The Shopify admin graphql client
 * @param variables - The variables to find the app subscription
 * @returns The app subscription or null if an error occurred
 */
async function find(
  authContext: AuthAdminContext | AuthWebhookContext,
  variables: UnstableAppSubscriptionByIdQueryVariables,
) {
  try {
    if (!authContext.session || !authContext.session.accessToken) {
      console.log(authContext);
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
      UNSTABLE_GRAPHQL_QUERY_APP_SUBSCRIPTION_BY_ID,
      {
        variables,
        apiVersion: "unstable",
      },
    );
    const data = await response.json();

    return data.data?.node;
  } catch (error) {
    console.error("Error finding app subscription:", error);
  }

  return null;
}

export const appSubscriptionModel = {
  find,
};
