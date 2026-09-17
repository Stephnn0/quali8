import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import type { PrismaClient } from "@prisma/client";
import {
  GRAPHQL_MUTATION_VALIDATION_CREATE,
  GRAPHQL_MUTATION_VALIDATION_UPDATE,
  GRAPHQL_QUERY_VALIDATIONS,
  GRAPHQL_QUERY_VALIDATION_FUNCTIONS,
} from "app/models/shopify.server/graphql/validation";
import { APP } from "app/constants/app.constants";
import { loadAlcoholRules, rememberValidationId } from "./alcoholRules.server";
import { buildAlcoholValidationConfig } from "./alcoholValidationConfig";

/** Handle of the function extension in extensions/alcohol-validation. */
export const ALCOHOL_FUNCTION_HANDLE = "alcohol-validation";
export const ALCOHOL_VALIDATION_TITLE = "Quali8 · Alcohol compliance";
export const ALCOHOL_METAFIELD_NAMESPACE = "$app";
export const ALCOHOL_METAFIELD_KEY = "alcohol-rules";

export type AlcoholValidationStatus =
  | { state: "active"; id: string }
  | { state: "off"; id: string }
  | { state: "missing" }
  | { state: "not-deployed" }
  | { state: "scope-missing"; message: string }
  | { state: "error"; message: string };

type GraphqlBody<T> = { data?: T; errors?: Array<{ message?: string }> };
type UserError = { field?: string[] | null; message: string; code?: string | null };

const looksLikeScopeError = (message: string) => /access denied|not approved|scope|permission/i.test(message);

async function read<T>(graphql: AdminGraphqlClient, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await graphql(query, { variables });
  const body = (await response.json()) as GraphqlBody<T>;
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message ?? "GraphQL error").join("; "));
  if (!body.data) throw new Error("Empty GraphQL response");
  return body.data;
}

const failure = (error: unknown): AlcoholValidationStatus => {
  const message = error instanceof Error ? error.message : "Unknown error";
  return looksLikeScopeError(message) ? { state: "scope-missing", message } : { state: "error", message };
};

/** Is our validation function part of the app version installed on this shop? */
async function functionDeployed(graphql: AdminGraphqlClient): Promise<boolean> {
  const data = await read<{
    shopifyFunctions: { nodes: Array<{ id: string; title: string; app: { handle: string } | null }> };
  }>(graphql, GRAPHQL_QUERY_VALIDATION_FUNCTIONS, { first: 25 });
  return data.shopifyFunctions.nodes.some((node) => node.app?.handle === APP.APP_HANDLE);
}

async function findValidation(graphql: AdminGraphqlClient) {
  const data = await read<{
    validations: {
      nodes: Array<{
        id: string;
        title: string;
        enabled: boolean;
        shopifyFunction: { id: string; app: { handle: string } | null } | null;
      }>;
    };
  }>(graphql, GRAPHQL_QUERY_VALIDATIONS, { first: 50 });
  const ours = data.validations.nodes.filter((node) => node.shopifyFunction?.app?.handle === APP.APP_HANDLE);
  return ours.find((node) => node.title === ALCOHOL_VALIDATION_TITLE) ?? ours[0] ?? null;
}

/** Read-only: is the alcohol validation live on this shop? Never throws. */
export async function detectAlcoholValidation(
  graphql: AdminGraphqlClient,
  db: PrismaClient,
  shop: string,
): Promise<AlcoholValidationStatus> {
  try {
    if (!(await functionDeployed(graphql))) return { state: "not-deployed" };
    const existing = await findValidation(graphql);
    if (!existing) return { state: "missing" };
    await rememberValidationId(db, shop, existing.id);
    return existing.enabled ? { state: "active", id: existing.id } : { state: "off", id: existing.id };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Creates or updates the Shopify validation so checkout enforces the saved
 * rules: `enable` follows the master switch, the config goes into the
 * `$app.alcohol-rules` json metafield (whose `collectionIds` also feeds the
 * function's input-query variable). Zone edits re-run this because the
 * config carries the zone zip lists.
 */
export async function syncAlcoholValidation(
  graphql: AdminGraphqlClient,
  db: PrismaClient,
  shop: string,
): Promise<AlcoholValidationStatus> {
  const status = await detectAlcoholValidation(graphql, db, shop);
  if (status.state !== "missing" && status.state !== "active" && status.state !== "off") return status;

  const [rules, zones] = await Promise.all([
    loadAlcoholRules(db, shop),
    db.deliveryZone.findMany({
      where: { shop },
      select: { active: true, zipCodes: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    }),
  ]);
  const config = buildAlcoholValidationConfig(rules, zones);
  const metafields = [
    {
      namespace: ALCOHOL_METAFIELD_NAMESPACE,
      key: ALCOHOL_METAFIELD_KEY,
      type: "json",
      value: JSON.stringify(config),
    },
  ];
  const enable = rules.enabled;

  try {
    let errors: UserError[];
    if (status.state === "missing") {
      const data = await read<{
        validationCreate: { validation: { id: string } | null; userErrors: UserError[] };
      }>(graphql, GRAPHQL_MUTATION_VALIDATION_CREATE, {
        validation: {
          functionHandle: ALCOHOL_FUNCTION_HANDLE,
          title: ALCOHOL_VALIDATION_TITLE,
          enable,
          blockOnFailure: true,
          metafields,
        },
      });
      errors = data.validationCreate.userErrors;
      if (data.validationCreate.validation) {
        await rememberValidationId(db, shop, data.validationCreate.validation.id);
      }
    } else {
      const data = await read<{
        validationUpdate: { validation: { id: string } | null; userErrors: UserError[] };
      }>(graphql, GRAPHQL_MUTATION_VALIDATION_UPDATE, {
        id: status.id,
        validation: { enable, metafields },
      });
      errors = data.validationUpdate.userErrors;
    }
    if (errors.length) return { state: "error", message: errors.map((e) => e.message).join("; ") };
    return detectAlcoholValidation(graphql, db, shop);
  } catch (error) {
    return failure(error);
  }
}

/** For zone edits: logs instead of failing the zone save. */
export async function syncAlcoholValidationQuietly(
  graphql: AdminGraphqlClient,
  db: PrismaClient,
  shop: string,
): Promise<void> {
  try {
    const status = await syncAlcoholValidation(graphql, db, shop);
    if (status.state === "error" || status.state === "scope-missing") {
      console.warn("Alcohol validation sync:", status.message); // eslint-disable-line no-console
    }
  } catch (error) {
    console.error("Alcohol validation sync failed:", error); // eslint-disable-line no-console
  }
}
