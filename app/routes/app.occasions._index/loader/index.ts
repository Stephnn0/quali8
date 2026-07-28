import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { DEFAULT_OCCASIONS } from "app/services/recommendations/constants";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export type OccasionRow = {
  id: number;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
  startMonth: number | null;
  startDay: number | null;
  endMonth: number | null;
  endDay: number | null;
  productCount: number;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute(
    { authAdminContext },
    { hasRecommendations: true },
    "redirect",
  );

  try {
    // First visit: seed the starter occasions so merchants edit rather than
    // start from a blank page. Idempotent via the count check.
    const existing = await db.occasion.count({ where: { shop: session.shop } });
    if (existing === 0) {
      await db.occasion.createMany({
        data: DEFAULT_OCCASIONS.map((occasion, index) => ({
          shop: session.shop,
          name: occasion.name,
          slug: occasion.slug,
          startMonth: occasion.startMonth,
          startDay: occasion.startDay,
          endMonth: occasion.endMonth,
          endDay: occasion.endDay,
          position: index,
        })),
      });
    }

    const occasions = await db.occasion.findMany({
      where: { shop: session.shop },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: { _count: { select: { products: true } } },
    });

    return handleApiSuccess<{ occasions: OccasionRow[] }>({
      payload: {
        occasions: occasions.map((occasion) => ({
          id: occasion.id,
          name: occasion.name,
          slug: occasion.slug,
          status: occasion.status,
          startMonth: occasion.startMonth,
          startDay: occasion.startDay,
          endMonth: occasion.endMonth,
          endDay: occasion.endDay,
          productCount: occasion._count.products,
        })),
      },
      code: "success",
    });
  } catch (error) {
    console.error("Error loading occasions:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
