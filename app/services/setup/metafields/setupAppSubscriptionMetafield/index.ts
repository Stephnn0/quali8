import type { AuthAdminContext } from "app/types/utility/shopify";
import { APP_SUBSCRIPTION_METAFIELD } from "./contants";
import type { PrismaClient } from "@prisma/client";
import { findMatchingMetafield } from "../utils";
import { createAppSubscriptionMetafieldDefinition } from "./createDefinition";
import { updateAppSubscriptionMetafieldDefinition } from "./updateDefinition";
import { shopifySubscriptionModel } from "app/models/app.server/shopifySubscriptions/subscriptions.server";
import { setAppSubscriptionMetafield } from "./set";
import type { ShopMetafieldsData } from "../fetchShopMefaieldData.server";

export async function setupSubscriptionMetafield(
  authAdminContext: AuthAdminContext,
  shopMetafieldsData: ShopMetafieldsData,
  db: PrismaClient,
) {
  if (!shopMetafieldsData?.app?.id)
    throw new Error("shopMetafieldsData not found");
  const {
    admin: { graphql },
  } = authAdminContext;

  // Checks that all of the values of the definition are correct, including the access
  const hasCorrectDefinition =
    shopMetafieldsData.metafieldDefinitions.nodes.some(
      (definition) =>
        definition.key === APP_SUBSCRIPTION_METAFIELD.key &&
        definition.namespace === APP_SUBSCRIPTION_METAFIELD.namespace &&
        // definition.type cannot be updated, so we don't need to check it
        definition.access.admin ===
          APP_SUBSCRIPTION_METAFIELD.access.output.admin &&
        definition.access.storefront ===
          APP_SUBSCRIPTION_METAFIELD.access.output.storefront &&
        definition.access.customerAccount ===
          APP_SUBSCRIPTION_METAFIELD.access.output.customerAccount,
    );

  const definitionExists = !!findMatchingMetafield(shopMetafieldsData.metafieldDefinitions.nodes, APP_SUBSCRIPTION_METAFIELD); /* eslint-disable-line max-len */ // prettier-ignore
  if (!definitionExists) {
    await createAppSubscriptionMetafieldDefinition(graphql);
  } else if (!hasCorrectDefinition) {
    await updateAppSubscriptionMetafieldDefinition(graphql);
  }

  const metafield = findMatchingMetafield(shopMetafieldsData.shop.metafields.nodes, APP_SUBSCRIPTION_METAFIELD); /* eslint-disable-line max-len */ // prettier-ignore
  if (metafield && isValidJSONMetafield(metafield)) {
    return metafield;
  }

  const subscription = await shopifySubscriptionModel.findActiveSubscription(
    db,
    authAdminContext,
  );

  return setAppSubscriptionMetafield(
    graphql,
    subscription,
    shopMetafieldsData.shop.id,
  );
}

// TODO - this should check the metafield against zod
/**
 * Checks if the metafield can be parsed as JSON
 *
 * @param metafield - The metafield to check
 * @returns True if the metafield value is of valid JSON, false otherwise
 */
const isValidJSONMetafield = (metafield: { value: string }) => {
  try {
    JSON.parse(metafield.value);
    return true;
  } catch {
    return false;
  }
};
