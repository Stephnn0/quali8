import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";
import {
  occasionBlockActionSchema,
  saveOccasionBlockSettings,
} from "app/services/occasions/occasionBlock.server";

export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  try {
    await gatekeepRoute(
      { authAdminContext },
      { hasRecommendations: true },
      "throw",
    );

    const formData = await request.formData();
    const body = JSON.parse(String(formData.get("body") ?? "{}"));

    if (request.method === "POST" && body?.action === "save-block-settings") {
      return saveOccasionBlockSettings(db, session.shop, occasionBlockActionSchema.parse(body));
    }

    if (request.method === "DELETE") {
      const occasionId = Number(body.occasionId);
      // deleteMany scopes by shop so another shop's id is a no-op
      await db.occasion.deleteMany({
        where: { id: occasionId, shop: session.shop },
      });
      return { code: "deleted", errors: null };
    }

    if (request.method === "PATCH") {
      const occasionId = Number(body.occasionId);
      const status = body.status === "ACTIVE" ? "ACTIVE" : "INACTIVE";
      await db.occasion.updateMany({
        where: { id: occasionId, shop: session.shop },
        data: { status },
      });
      return { code: "updated", errors: null };
    }

    return { code: "noop", errors: null };
  } catch (error) {
    console.error("Error in occasions action:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
