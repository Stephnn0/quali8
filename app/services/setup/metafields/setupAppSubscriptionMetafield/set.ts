import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import type { RichShopifySubscription } from "app/services/subscriptions/gatekeep/types";
import { APP_SUBSCRIPTION_METAFIELD } from "./contants";
import type { SetMetafieldMutationVariables } from "app/types/admin.generated";
import { setMetafields } from "app/models/shopify.server/metafield";
import { findMatchingMetafield } from "../utils";

export async function setAppSubscriptionMetafield(
  graphql: AdminGraphqlClient,
  subscription: RichShopifySubscription | null,
  shopID: string,
) {
  const variables: SetMetafieldMutationVariables = {
    metafieldsSetInput: [
      {
        ownerId: shopID,
        key: APP_SUBSCRIPTION_METAFIELD.key,
        type: APP_SUBSCRIPTION_METAFIELD.type,
        value: JSON.stringify(subscription || null),
        namespace: APP_SUBSCRIPTION_METAFIELD.namespace,
      },
    ],
  };

  const metafields = await setMetafields(graphql, variables);
  const matchingMetafield = findMatchingMetafield(
    metafields,
    APP_SUBSCRIPTION_METAFIELD,
  );

  return matchingMetafield;
}
