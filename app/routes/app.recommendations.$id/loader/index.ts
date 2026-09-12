import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import type { RuleSourceProduct } from "app/services/recommendations/smartRecommendations.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export type RuleDetail = {
  id: number;
  name: string;
  heading: string | null;
  status: "ACTIVE" | "INACTIVE";
  trigger: "ALWAYS" | "CART_HAS_COLLECTION" | "CART_HAS_PRODUCT" | "CART_TOTAL_MIN";
  triggerCollectionId: string | null;
  triggerCollectionTitle: string | null;
  triggerProductId: string | null;
  triggerProductTitle: string | null;
  triggerMinTotal: number | null;
  source: "COLLECTION" | "TAG" | "NEWEST" | "PRODUCTS";
  sourceCollectionId: string | null;
  sourceCollectionTitle: string | null;
  sourceTag: string | null;
  sourceProducts: RuleSourceProduct[];
  minPrice: number | null;
  maxPrice: number | null;
  limit: number;
  excludeCartItems: boolean;
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute(
    { authAdminContext },
    { hasRecommendations: true },
    "redirect",
  );

  try {
    if (params.id === "new") {
      return handleApiSuccess<{ rule: RuleDetail | null }>({
        payload: { rule: null },
        code: "loaded",
      });
    }

    const rule = await db.recommendationRule.findFirst({
      where: { id: Number(params.id), shop: session.shop },
    });
    if (!rule) {
      return handleApiSuccess<{ rule: RuleDetail | null }>({
        payload: { rule: null },
        code: "not_found",
      });
    }

    return handleApiSuccess<{ rule: RuleDetail | null }>({
      payload: {
        rule: {
          id: rule.id,
          name: rule.name,
          heading: rule.heading,
          status: rule.status,
          trigger: rule.trigger,
          triggerCollectionId: rule.triggerCollectionId,
          triggerCollectionTitle: rule.triggerCollectionTitle,
          triggerProductId: rule.triggerProductId,
          triggerProductTitle: rule.triggerProductTitle,
          triggerMinTotal: rule.triggerMinTotal,
          source: rule.source,
          sourceCollectionId: rule.sourceCollectionId,
          sourceCollectionTitle: rule.sourceCollectionTitle,
          sourceTag: rule.sourceTag,
          sourceProducts: Array.isArray(rule.sourceProducts)
            ? (rule.sourceProducts as RuleSourceProduct[])
            : [],
          minPrice: rule.minPrice,
          maxPrice: rule.maxPrice,
          limit: rule.limit,
          excludeCartItems: rule.excludeCartItems,
        },
      },
      code: "loaded",
    });
  } catch (error) {
    console.error("Error loading recommendation rule:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
