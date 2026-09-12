import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export type RuleRow = {
  id: number;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  position: number;
  /** Human summary of the trigger, e.g. "Cart has a product from Bouquets". */
  when: string;
  /** Human summary of the source, e.g. "Products from Vases". */
  show: string;
  limit: number;
};

const money = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute(
    { authAdminContext },
    { hasRecommendations: true },
    "redirect",
  );

  try {
    const rules = await db.recommendationRule.findMany({
      where: { shop: session.shop },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });

    return handleApiSuccess<{ rules: RuleRow[] }>({
      payload: {
        rules: rules.map((rule) => {
          let when = "Every cart";
          if (rule.trigger === "CART_HAS_COLLECTION") {
            when = `Cart has a product from ${rule.triggerCollectionTitle ?? "a collection"}`;
          } else if (rule.trigger === "CART_HAS_PRODUCT") {
            when = `Cart has ${rule.triggerProductTitle ?? "a product"}`;
          } else if (rule.trigger === "CART_TOTAL_MIN") {
            when = `Cart total is at least ${money(rule.triggerMinTotal ?? 0)}`;
          }

          let show = "Newest products";
          if (rule.source === "COLLECTION") {
            show = `Products from ${rule.sourceCollectionTitle ?? "a collection"}`;
          } else if (rule.source === "TAG") {
            show = `Products tagged ${rule.sourceTag ?? ""}`.trim();
          } else if (rule.source === "PRODUCTS") {
            const count = Array.isArray(rule.sourceProducts)
              ? rule.sourceProducts.length
              : 0;
            show = `${count} hand-picked ${count === 1 ? "product" : "products"}`;
          }
          if (rule.minPrice !== null || rule.maxPrice !== null) {
            const min = rule.minPrice !== null ? money(rule.minPrice) : null;
            const max = rule.maxPrice !== null ? money(rule.maxPrice) : null;
            show += min && max ? ` (${min}–${max})` : min ? ` (${min}+)` : ` (under ${max})`;
          }

          return {
            id: rule.id,
            name: rule.name,
            status: rule.status,
            position: rule.position,
            when,
            show,
            limit: rule.limit,
          };
        }),
      },
      code: "success",
    });
  } catch (error) {
    console.error("Error loading recommendation rules:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
