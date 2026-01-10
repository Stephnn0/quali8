import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import type { UpdateMetafieldDefinitionMutationVariables } from "app/types/admin.generated";
import { APP_SUBSCRIPTION_METAFIELD } from "./contants";
import { updateMetafieldDefinition } from "app/models/shopify.server/metafield";

export async function updateAppSubscriptionMetafieldDefinition(
  graphql: AdminGraphqlClient,
) {
  const variables: UpdateMetafieldDefinitionMutationVariables = {
    definition: {
      key: APP_SUBSCRIPTION_METAFIELD.key,
      namespace: APP_SUBSCRIPTION_METAFIELD.namespace,
      ownerType: APP_SUBSCRIPTION_METAFIELD.ownerType,
      access: APP_SUBSCRIPTION_METAFIELD.access.input,
    },
  };

  const metafieldDefinition = await updateMetafieldDefinition(
    graphql,
    variables,
  );

  return metafieldDefinition;
}
