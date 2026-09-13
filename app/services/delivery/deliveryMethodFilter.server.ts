import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  GRAPHQL_MUTATION_DELIVERY_CUSTOMIZATION_CREATE,
  GRAPHQL_MUTATION_DELIVERY_CUSTOMIZATION_UPDATE,
  GRAPHQL_QUERY_DELIVERY_CUSTOMIZATIONS,
  GRAPHQL_QUERY_DELIVERY_CUSTOMIZATION_FUNCTIONS,
} from "app/models/shopify.server/graphql/deliveryCustomization";

/** Handle of the function extension in extensions/delivery-method-filter. */
export const FUNCTION_HANDLE = "delivery-method-filter";
export const CUSTOMIZATION_TITLE = "Quali8 · Delivery method from the cart";

type GraphqlBody<T> = { data?: T; errors?: Array<{ message?: string }> };
type UserError = { field?: string[] | null; message: string };

export type DeliveryMethodFilterStatus =
  | { state: "installed"; id: string }
  | { state: "disabled"; id: string }
  | { state: "missing"; functionId: string }
  | { state: "not-deployed" }
  | { state: "scope-missing"; message: string }
  | { state: "error"; message: string };

const looksLikeScopeError = (message: string) =>
  /access denied|not approved|scope|permission/i.test(message);

async function read<T>(graphql: AdminGraphqlClient, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await graphql(query, { variables });
  const body = (await response.json()) as GraphqlBody<T>;
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message ?? "GraphQL error").join("; "));
  if (!body.data) throw new Error("Empty GraphQL response");
  return body.data;
}

/** Our delivery customization function on this shop, once the extension is deployed. */
async function findFunctionId(graphql: AdminGraphqlClient, appHandle: string): Promise<string | null> {
  const data = await read<{ shopifyFunctions: { nodes: Array<{ id: string; title: string; app: { handle: string } | null }> } }>(
    graphql,
    GRAPHQL_QUERY_DELIVERY_CUSTOMIZATION_FUNCTIONS,
    { first: 25 },
  );
  const ours = data.shopifyFunctions.nodes.filter((node) => node.app?.handle === appHandle);
  const byTitle = ours.find((node) => /delivery method/i.test(node.title));
  return (byTitle ?? ours[0])?.id ?? null;
}

async function findCustomization(graphql: AdminGraphqlClient, functionId: string) {
  const data = await read<{ deliveryCustomizations: { nodes: Array<{ id: string; enabled: boolean; functionId: string }> } }>(
    graphql,
    GRAPHQL_QUERY_DELIVERY_CUSTOMIZATIONS,
    { first: 50 },
  );
  return data.deliveryCustomizations.nodes.find((node) => node.functionId === functionId) ?? null;
}

/** Read-only: is the "delivery method from the cart" customization active on the shop? */
export async function detectDeliveryMethodFilter(
  graphql: AdminGraphqlClient,
  appHandle: string,
): Promise<DeliveryMethodFilterStatus> {
  try {
    const functionId = await findFunctionId(graphql, appHandle);
    if (!functionId) return { state: "not-deployed" };
    const existing = await findCustomization(graphql, functionId);
    if (!existing) return { state: "missing", functionId };
    return existing.enabled ? { state: "installed", id: existing.id } : { state: "disabled", id: existing.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (looksLikeScopeError(message)) return { state: "scope-missing", message };
    return { state: "error", message };
  }
}

/** Creates the customization, or re-enables it, so checkout runs the function. */
export async function installDeliveryMethodFilter(
  graphql: AdminGraphqlClient,
  appHandle: string,
): Promise<DeliveryMethodFilterStatus> {
  const status = await detectDeliveryMethodFilter(graphql, appHandle);
  if (status.state !== "missing" && status.state !== "disabled") return status;
  try {
    const errors: UserError[] =
      status.state === "missing"
        ? (
            await read<{ deliveryCustomizationCreate: { deliveryCustomization: { id: string } | null; userErrors: UserError[] } }>(
              graphql,
              GRAPHQL_MUTATION_DELIVERY_CUSTOMIZATION_CREATE,
              { deliveryCustomization: { functionId: status.functionId, title: CUSTOMIZATION_TITLE, enabled: true } },
            )
          ).deliveryCustomizationCreate.userErrors
        : (
            await read<{ deliveryCustomizationUpdate: { deliveryCustomization: { id: string } | null; userErrors: UserError[] } }>(
              graphql,
              GRAPHQL_MUTATION_DELIVERY_CUSTOMIZATION_UPDATE,
              { id: status.id, deliveryCustomization: { enabled: true } },
            )
          ).deliveryCustomizationUpdate.userErrors;
    if (errors.length) return { state: "error", message: errors.map((e) => e.message).join("; ") };
    return detectDeliveryMethodFilter(graphql, appHandle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (looksLikeScopeError(message)) return { state: "scope-missing", message };
    return { state: "error", message };
  }
}
