import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

const saveSchema = z.object({
  action: z.literal("save"),
  enabled: z.boolean(),
  title: z.string().trim().min(1).max(60),
  fallbackPrice: z.number().min(0).nullable(),
});

export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  try {
    await gatekeepRoute(
      { authAdminContext },
      { hasShippingDiscounts: true },
      "throw",
    );

    const formData = await request.formData();
    const body = saveSchema.parse(JSON.parse(String(formData.get("body") ?? "{}")));

    const data = {
      enabled: body.enabled,
      title: body.title,
      fallbackPrice: body.fallbackPrice,
    };
    await db.carrierRate.upsert({
      where: { shop: session.shop },
      create: { ...data, shop: session.shop },
      update: data,
    });
    return { code: "saved", errors: null };
  } catch (error) {
    console.error("Error saving delivery rates:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
