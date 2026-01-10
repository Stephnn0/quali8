import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  GRAPHQL_MUTATION_METAFIELD_DEFINITION_CREATE,
  GRAPHQL_MUTATION_METAFIELD_DEFINITION_UPDATE,
  GRAPHQL_MUTATION_METAFIELD_SET,
} from "../graphql/metafield";
import type {
  MetafieldDefinitionCreateMutationVariables,
  SetMetafieldMutationVariables,
  UpdateMetafieldDefinitionMutationVariables,
} from "app/types/admin.generated";

export async function setMetafields(
  graphql: AdminGraphqlClient,
  variables: SetMetafieldMutationVariables,
) {
  const res = await graphql(GRAPHQL_MUTATION_METAFIELD_SET, {
    variables,
  });

  const { data } = await res.json();

  // await captureAndThrow({
  //   operation: 'graphql',
  //   userErrors: data?.metafieldsSet?.userErrors,
  // });

  if (!data?.metafieldsSet?.metafields) {
    throw new Error("Failed to set metafields");
  }

  return data?.metafieldsSet?.metafields;
}

export async function createMetafieldDefinition(
  graphql: AdminGraphqlClient,
  variables: MetafieldDefinitionCreateMutationVariables,
) {
  const res = await graphql(GRAPHQL_MUTATION_METAFIELD_DEFINITION_CREATE, {
    variables,
  });

  const { data } = await res.json();

  // await captureAndThrow({
  //   operation: 'graphql',
  //   userErrors: data?.metafieldDefinitionCreate?.userErrors,
  // });

  if (!data?.metafieldDefinitionCreate?.createdDefinition) {
    throw new Error("Failed to create metafield definition");
  }

  return data?.metafieldDefinitionCreate?.createdDefinition;
}

export async function updateMetafieldDefinition(
  graphql: AdminGraphqlClient,
  variables: UpdateMetafieldDefinitionMutationVariables,
) {
  const res = await graphql(GRAPHQL_MUTATION_METAFIELD_DEFINITION_UPDATE, {
    variables,
  });

  const { data } = await res.json();

  // await captureAndThrow({
  //   operation: 'graphql',
  //   userErrors: data?.metafieldDefinitionUpdate?.userErrors,
  // });

  if (!data?.metafieldDefinitionUpdate?.updatedDefinition) {
    throw new Error("Failed to update metafield definition");
  }

  return data?.metafieldDefinitionUpdate?.updatedDefinition;
}
