import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ruleId: z.number().int().positive() }),
  z.object({
    action: z.literal("status"),
    ruleId: z.number().int().positive(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
  }),
  z.object({
    action: z.literal("move"),
    ruleId: z.number().int().positive(),
    direction: z.enum(["up", "down"]),
  }),
]);

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
    const body = bodySchema.parse(
      JSON.parse(String(formData.get("body") ?? "{}")),
    );

    // Every write scopes by shop so another shop's id is a no-op
    switch (body.action) {
      case "delete":
        await db.recommendationRule.deleteMany({
          where: { id: body.ruleId, shop: session.shop },
        });
        return { code: "deleted", errors: null };

      case "status":
        await db.recommendationRule.updateMany({
          where: { id: body.ruleId, shop: session.shop },
          data: { status: body.status },
        });
        return { code: "updated", errors: null };

      case "move": {
        const rules = await db.recommendationRule.findMany({
          where: { shop: session.shop },
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: { id: true },
        });
        const index = rules.findIndex((rule) => rule.id === body.ruleId);
        const target = body.direction === "up" ? index - 1 : index + 1;
        if (index === -1 || target < 0 || target >= rules.length) {
          return { code: "noop", errors: null };
        }
        const order = rules.map((rule) => rule.id);
        [order[index], order[target]] = [order[target], order[index]];
        await db.$transaction(
          order.map((id, position) =>
            db.recommendationRule.update({ where: { id }, data: { position } }),
          ),
        );
        return { code: "moved", errors: null };
      }
    }
  } catch (error) {
    console.error("Error in recommendation rules action:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
