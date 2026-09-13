import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import type { DeliveryConfig } from "app/components/Delivery/types";
import { loadDeliveryConfig } from "app/services/delivery/deliveryZones.server";
import { loadDeliverySchedule } from "app/services/delivery/deliverySchedule.server";
import type { DeliverySchedule } from "app/services/delivery/deliverySchedule";
import {
  detectCarrierService,
  type CarrierDetectStatus,
} from "app/services/carrier/setupCarrierService.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export type DeliveryPageData = {
  carrier: CarrierDetectStatus;
  rate: { enabled: boolean; title: string; fallbackPrice: number | null };
  delivery: DeliveryConfig;
  schedule: DeliverySchedule;
};

/**
 * The Delivery hub: zones + zip checker, the checkout rate, storefront
 * setup, and the carrier service status. Detection is read-only here; the
 * merchant installs the carrier service with the button (see action).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  await gatekeepRoute(
    { authAdminContext },
    { hasShippingDiscounts: true },
    "redirect",
  );

  try {
    const [carrier, rate, delivery, schedule] = await Promise.all([
      detectCarrierService(admin.graphql),
      db.carrierRate.findUnique({ where: { shop: session.shop } }),
      loadDeliveryConfig(db, session.shop),
      loadDeliverySchedule(db, session.shop),
    ]);

    return handleApiSuccess<DeliveryPageData>({
      payload: {
        carrier,
        rate: {
          enabled: rate?.enabled ?? true,
          title: rate?.title ?? "Local delivery",
          fallbackPrice: rate?.fallbackPrice ?? null,
        },
        delivery,
        schedule,
      },
      code: "success",
    });
  } catch (error) {
    console.error("Error loading the delivery page:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
