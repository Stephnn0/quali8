import type { LoaderFunctionArgs } from "react-router";
import { getQualifiersByShopWithCustomersAndConditions } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import {
  computeAudienceStats,
  summarizeAudiences,
  type AudienceStats,
  type AudienceSummary,
} from "app/services/audiences/audienceStats";
import {
  computeCustomerInsights,
  type CustomerInsights,
} from "app/services/audiences/customerInsights";
import { getCustomerInsightsSample } from "app/models/shopify.server/customers";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const itemsPerPage = 15;
  const skip = (page - 1) * itemsPerPage;

  try {
    // Analytics must not break the page — degrade to a hidden section instead.
    const insightsPromise: Promise<CustomerInsights | null> =
      getCustomerInsightsSample(admin.graphql)
        .then((sample) =>
          computeCustomerInsights(sample.customers, sample.totalCustomers),
        )
        .catch((error) => {
          console.error("Customer insights unavailable:", error);
          return null;
        });

    const qualifiers = await getQualifiersByShopWithCustomersAndConditions(
      {
        where: { shop: session.shop },
        orderBy: { updatedAt: "desc" },
        take: itemsPerPage,
        skip,
      },
      db,
    );

    const insights = await insightsPromise;

    const audiences = (qualifiers?.qualifiers ?? []).map((qualifier) => ({
      id: qualifier.id,
      name: qualifier.name,
      description: qualifier.description,
      conditionLogicType: qualifier.conditionLogicType,
      lastSyncedAt: qualifier.lastSyncedAt,
      conditions: qualifier.conditions.map((condition) => ({
        id: condition.id,
        type: condition.type,
        comparisonType: condition.comparisonType,
        value: condition.value,
      })),
      stats: computeAudienceStats(qualifier.customers),
    }));

    const summary = summarizeAudiences(qualifiers?.qualifiers ?? []);

    return handleApiSuccess<AudiencesIndexData>({
      payload: {
        audiences,
        summary,
        insights,
        itemsPerPage,
        page,
        total: qualifiers?.qualifiersCount ?? 0,
      },
      code: "success",
    });
  } catch (error) {
    console.error(error);
    return handleApiError({ errors: error, code: "error" });
  }
}

export type AudienceRow = {
  id: number;
  name: string;
  description: string;
  conditionLogicType: string;
  lastSyncedAt: Date | null;
  conditions: Array<{
    id: number;
    type: string;
    comparisonType: string;
    value: string;
  }>;
  stats: AudienceStats;
};

export type AudiencesIndexData = {
  audiences: AudienceRow[];
  summary: AudienceSummary;
  insights: CustomerInsights | null;
  itemsPerPage: number;
  page: number;
  total: number;
};
