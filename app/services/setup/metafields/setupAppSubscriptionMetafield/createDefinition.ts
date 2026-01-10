import type { MetafieldDefinitionCreateMutationVariables } from "app/types/admin.generated";
import { APP_SUBSCRIPTION_METAFIELD } from "./contants";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { createMetafieldDefinition } from "app/models/shopify.server/metafield";

/**
 * Create the App Subscription metafield definition.
 *
 * @param graphql - The Shopify admin graphql client
 * @returns The App Subscription metafield definition
 */
export async function createAppSubscriptionMetafieldDefinition(
  graphql: AdminGraphqlClient,
) {
  const variables: MetafieldDefinitionCreateMutationVariables = {
    definition: {
      key: APP_SUBSCRIPTION_METAFIELD.key,
      name: APP_SUBSCRIPTION_METAFIELD.name,
      type: APP_SUBSCRIPTION_METAFIELD.type,
      namespace: APP_SUBSCRIPTION_METAFIELD.namespace,
      ownerType: APP_SUBSCRIPTION_METAFIELD.ownerType,
      access: APP_SUBSCRIPTION_METAFIELD.access.input,
    },
  };

  const metafieldDefinition = await createMetafieldDefinition(
    graphql,
    variables,
  );

  return metafieldDefinition;
}
