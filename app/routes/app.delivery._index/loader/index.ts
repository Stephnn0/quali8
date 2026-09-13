import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import type { DeliveryConfig } from "app/components/Delivery/types";
import { loadDeliveryConfig } from "app/services/delivery/deliveryZones.server";
import { loadDeliverySchedule } from "app/services/delivery/deliverySchedule.server";
import type { DeliverySchedule } from "app/services/delivery/deliverySchedule";
import { syncShopTimezone } from "app/services/delivery/shopTimezone.server";
import { shopNow, type ShopClock } from "app/services/delivery/shopTime";
import { loadTimeWindows } from "app/services/delivery/timedDelivery.server";
import type { TimeWindowRow } from "app/services/delivery/timedDelivery";
import { DEFAULT_RATE_TITLE } from "app/services/carrier/rates";
import {
  detectCarrierService,
  type CarrierDetectStatus,
} from "app/services/carrier/setupCarrierService.server";
import {
  detectDeliveryMethodFilter,
  type DeliveryMethodFilterStatus,
} from "app/services/delivery/deliveryMethodFilter.server";
import { APP } from "app/constants/app.constants";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export type DeliveryPageData = {
  carrier: CarrierDetectStatus;
  /** The checkout function that keeps only the method chosen in the cart. */
  methodFilter: DeliveryMethodFilterStatus;
  rate: { enabled: boolean; title: string; fallbackPrice: number | null };
  delivery: DeliveryConfig;
  schedule: DeliverySchedule;
  /** The shop's clock as the storefront and carrier will see it; `known` is false when the zone couldn't be read. */
  clock: ShopClock & { known: boolean };
  timeWindows: TimeWindowRow[];
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
    const [carrier, methodFilter, rate, delivery, schedule, timezone, timeWindows] = await Promise.all([
      detectCarrierService(admin.graphql),
      detectDeliveryMethodFilter(admin.graphql, APP.APP_HANDLE),
      db.carrierRate.findUnique({ where: { shop: session.shop } }),
      loadDeliveryConfig(db, session.shop),
      loadDeliverySchedule(db, session.shop),
      syncShopTimezone(db, admin.graphql, session.shop),
      loadTimeWindows(db, session.shop),
    ]);

    return handleApiSuccess<DeliveryPageData>({
      payload: {
        carrier,
        methodFilter,
        rate: {
          enabled: rate?.enabled ?? true,
          title: rate?.title ?? DEFAULT_RATE_TITLE,
          fallbackPrice: rate?.fallbackPrice ?? null,
        },
        delivery,
        schedule,
        clock: { ...shopNow(timezone), known: timezone !== null },
        timeWindows,
      },
      code: "success",
    });
  } catch (error) {
    console.error("Error loading the delivery page:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
