import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import {
  deliveryActionSchema,
  runDeliveryAction,
} from "app/services/delivery/deliveryZones.server";
import { setupCarrierService } from "app/services/carrier/setupCarrierService.server";
import {
  saveDeliverySchedule,
  scheduleActionSchema,
} from "app/services/delivery/deliverySchedule.server";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("install-carrier") }),
  z.object({
    action: z.literal("save-rate"),
    enabled: z.boolean(),
    title: z.string().trim().min(1).max(60),
    fallbackPrice: z.number().min(0).nullable(),
  }),
  scheduleActionSchema,
  ...deliveryActionSchema.options,
]);

export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  try {
    await gatekeepRoute(
      { authAdminContext },
      { hasShippingDiscounts: true },
      "throw",
    );

    const formData = await request.formData();
    const body = bodySchema.parse(JSON.parse(String(formData.get("body") ?? "{}")));

    switch (body.action) {
      case "install-carrier": {
        const status = await setupCarrierService(db, admin.graphql, session.shop);
        return {
          code: status.state === "registered" ? "carrier-installed" : "carrier-failed",
          status,
          errors:
            status.state === "registered" ? null : [{ message: status.message }],
        };
      }

      case "save-rate": {
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
        return { code: "rate-saved", errors: null };
      }

      case "save-schedule":
        return saveDeliverySchedule(db, session.shop, body);

      default:
        return runDeliveryAction({ db, shop: session.shop, body });
    }
  } catch (error) {
    console.error("Error in delivery action:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
