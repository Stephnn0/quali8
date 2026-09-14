import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  GRAPHQL_MUTATION_POPUP_CUSTOMER_CONSENT,
  GRAPHQL_MUTATION_POPUP_CUSTOMER_CREATE,
  GRAPHQL_MUTATION_POPUP_CUSTOMER_TAGS_ADD,
  GRAPHQL_QUERY_CUSTOMERS,
  GRAPHQL_QUERY_CUSTOMER_BY_EMAIL,
  GRAPHQL_QUERY_CUSTOMER_INSIGHTS,
} from "../graphql/customers";

export async function getCustomers(graphql: AdminGraphqlClient, query = "") {
  try {
    const variables = {
      first: 50,
      query,
    };

    const response = await graphql(GRAPHQL_QUERY_CUSTOMERS, { variables });

    const data = await response.json();

    return data?.data?.customers.edges;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
}

export type CustomerInsightsSample = {
  totalCustomers: number;
  customers: Array<{
    id: string;
    createdAt: string;
    numberOfOrders: number;
    amountSpent: number;
    country: string | null;
  }>;
};

/** Most recent customers + total count, for the analytics section. */
export async function getCustomerInsightsSample(
  graphql: AdminGraphqlClient,
  first = 250,
): Promise<CustomerInsightsSample> {
  const response = await graphql(GRAPHQL_QUERY_CUSTOMER_INSIGHTS, {
    variables: { first },
  });

  const { data } = await response.json();

  type InsightsEdge = {
    node: {
      id: string;
      createdAt: string;
      numberOfOrders?: string | number | null;
      amountSpent?: { amount?: string | null } | null;
      defaultAddress?: { country?: string | null } | null;
    };
  };

  const edges = (data?.customers.edges ?? []) as InsightsEdge[];
  const customers = edges.map(({ node }) => ({
    id: node.id,
    createdAt: node.createdAt as string,
    numberOfOrders: Number(node.numberOfOrders ?? 0),
    amountSpent: Number.parseFloat(node.amountSpent?.amount ?? "0") || 0,
    country: node.defaultAddress?.country ?? null,
  }));

  return {
    totalCustomers: data?.customersCount?.count ?? customers.length,
    customers,
  };
}

// --- Subscribe Boost -----------------------------------------------------------

export type SubscribeCustomerInput = {
  email: string;
  firstName?: string;
  tags: string[];
};

export type SubscribeCustomerResult =
  | { state: "created"; customerId: string }
  | { state: "updated"; customerId: string }
  | { state: "scope-missing"; message: string }
  | { state: "error"; message: string };

const looksLikeScopeError = (message: string) =>
  /access denied|not approved|scope|permission/i.test(message);

const firstUserError = (errors: Array<{ message: string }> | null | undefined) =>
  errors?.[0]?.message ?? null;

/**
 * Saves a popup signup in Shopify customers: creates the customer with
 * marketing consent and the tags, or, when the email already belongs to a
 * customer, adds the tags and subscribes them. Requires `write_customers`;
 * reports `scope-missing` instead of throwing when the app lacks it.
 */
export async function subscribeCustomer(
  graphql: AdminGraphqlClient,
  input: SubscribeCustomerInput,
): Promise<SubscribeCustomerResult> {
  const consent = {
    marketingState: "SUBSCRIBED",
    marketingOptInLevel: "SINGLE_OPT_IN",
    consentUpdatedAt: new Date().toISOString(),
  };

  try {
    const lookup = await graphql(GRAPHQL_QUERY_CUSTOMER_BY_EMAIL, {
      variables: { query: `email:"${input.email.replace(/"/g, "")}"` },
    });
    const lookupPayload = await lookup.json();
    type Existing = {
      id: string;
      tags?: string[] | null;
      emailMarketingConsent?: { marketingState?: string | null } | null;
    };
    const existing = (lookupPayload?.data?.customers?.edges?.[0]?.node ?? null) as Existing | null;

    if (!existing) {
      const response = await graphql(GRAPHQL_MUTATION_POPUP_CUSTOMER_CREATE, {
        variables: {
          input: {
            email: input.email,
            firstName: input.firstName || undefined,
            tags: input.tags,
            emailMarketingConsent: consent,
          },
        },
      });
      const payload = await response.json();
      const created = payload?.data?.customerCreate;
      const error = firstUserError(created?.userErrors);
      if (error) return { state: "error", message: error };
      const customerId = created?.customer?.id as string | undefined;
      if (!customerId) return { state: "error", message: "Shopify did not return the customer" };
      return { state: "created", customerId };
    }

    const missingTags = input.tags.filter((tag) => !(existing.tags ?? []).includes(tag));
    if (missingTags.length) {
      const response = await graphql(GRAPHQL_MUTATION_POPUP_CUSTOMER_TAGS_ADD, {
        variables: { id: existing.id, tags: missingTags },
      });
      const payload = await response.json();
      const error = firstUserError(payload?.data?.tagsAdd?.userErrors);
      if (error) return { state: "error", message: error };
    }

    if (existing.emailMarketingConsent?.marketingState !== "SUBSCRIBED") {
      const response = await graphql(GRAPHQL_MUTATION_POPUP_CUSTOMER_CONSENT, {
        variables: {
          input: { customerId: existing.id, emailMarketingConsent: consent },
        },
      });
      const payload = await response.json();
      const error = firstUserError(
        payload?.data?.customerEmailMarketingConsentUpdate?.userErrors,
      );
      if (error) return { state: "error", message: error };
    }

    return { state: "updated", customerId: existing.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (looksLikeScopeError(message)) return { state: "scope-missing", message };
    return { state: "error", message };
  }
}
