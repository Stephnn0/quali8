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
import { installDeliveryMethodFilter } from "app/services/delivery/deliveryMethodFilter.server";
import { APP } from "app/constants/app.constants";
import {
  saveDeliverySchedule,
  saveTodayRules,
  scheduleActionSchema,
  todayRulesActionSchema,
} from "app/services/delivery/deliverySchedule.server";
import {
  saveTimeWindows,
  timeWindowsActionSchema,
} from "app/services/delivery/timedDelivery.server";
import {
  cartOptionsActionSchema,
  saveCartOptions,
} from "app/services/delivery/cartOptions.server";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("install-carrier") }),
  z.object({ action: z.literal("install-method-filter") }),
  z.object({
    action: z.literal("save-rate"),
    enabled: z.boolean(),
    title: z.string().trim().min(1).max(60),
    fallbackPrice: z.number().min(0).nullable(),
  }),
  scheduleActionSchema,
  todayRulesActionSchema,
  timeWindowsActionSchema,
  cartOptionsActionSchema,
  ...deliveryActionSchema.options,
]);

const ZONE_ACTIONS = new Set<string>(
  deliveryActionSchema.options.map((option) => option.shape.action.value),
);

export async function action({ request }: ActionFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  try {
    const formData = await request.formData();
    const body = bodySchema.parse(JSON.parse(String(formData.get("body") ?? "{}")));

    // Zones and the zip checker switch are on every plan; everything else
    // on this page needs Advance.
    const zonesOnly = ZONE_ACTIONS.has(body.action);
    await gatekeepRoute(
      { authAdminContext },
      zonesOnly ? { hasDeliveryZones: true } : { hasShippingDiscounts: true },
      "throw",
    );

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

      case "install-method-filter": {
        const status = await installDeliveryMethodFilter(admin.graphql, APP.APP_HANDLE);
        const ok = status.state === "installed";
        return {
          code: ok ? "method-filter-installed" : "method-filter-failed",
          status,
          errors: ok ? null : [{ message: "message" in status ? status.message : `Could not install (${status.state})` }],
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

      case "save-today-rules":
        return saveTodayRules(db, session.shop, body);

      case "save-time-windows":
        return saveTimeWindows(db, session.shop, body);

      case "save-cart-options":
        return saveCartOptions(db, session.shop, body);

      default:
        return runDeliveryAction({ db, shop: session.shop, body });
    }
  } catch (error) {
    console.error("Error in delivery action:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
