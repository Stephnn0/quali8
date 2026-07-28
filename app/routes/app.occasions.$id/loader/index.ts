import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

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
      return handleApiSuccess({ payload: { occasion: null }, code: "loaded" });
    }

    const occasion = await db.occasion.findFirst({
      where: { id: Number(params.id), shop: session.shop },
      include: { products: { orderBy: { position: "asc" } } },
    });

    if (!occasion) {
      return handleApiSuccess({
        payload: { occasion: null },
        code: "not_found",
      });
    }

    return handleApiSuccess({ payload: { occasion }, code: "loaded" });
  } catch (error) {
    console.error("Error loading occasion:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
