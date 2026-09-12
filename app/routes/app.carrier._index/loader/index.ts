import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import {
  setupCarrierService,
  type CarrierSetupStatus,
} from "app/services/carrier/setupCarrierService.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export type CarrierPageData = {
  status: CarrierSetupStatus;
  rate: { enabled: boolean; title: string; fallbackPrice: number | null };
  deliveryCheckEnabled: boolean;
  zones: { total: number; active: number; priced: number };
};

export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session, admin } = authAdminContext;

  await gatekeepRoute(
    { authAdminContext },
    { hasShippingDiscounts: true },
    "redirect",
  );

  try {
    // Register (or repair) the carrier service every visit — cheap, and it
    // is how we learn whether the Shopify plan supports it.
    const [status, rate, store, total, active, priced] = await Promise.all([
      setupCarrierService(db, admin.graphql, session.shop),
      db.carrierRate.findUnique({ where: { shop: session.shop } }),
      db.shopifyStore.findUnique({
        where: { shop: session.shop },
        select: { deliveryCheckEnabled: true },
      }),
      db.deliveryZone.count({ where: { shop: session.shop } }),
      db.deliveryZone.count({ where: { shop: session.shop, active: true } }),
      db.deliveryZone.count({
        where: { shop: session.shop, active: true, price: { not: null } },
      }),
    ]);

    return handleApiSuccess<CarrierPageData>({
      payload: {
        status,
        rate: {
          enabled: rate?.enabled ?? true,
          title: rate?.title ?? "Local delivery",
          fallbackPrice: rate?.fallbackPrice ?? null,
        },
        deliveryCheckEnabled: store?.deliveryCheckEnabled ?? false,
        zones: { total, active, priced },
      },
      code: "success",
    });
  } catch (error) {
    console.error("Error loading delivery rates:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
