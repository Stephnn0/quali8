import type { PrismaClient } from "@prisma/client";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import {
  CarrierServiceError,
  createCarrierService,
  getCarrierServices,
  updateCarrierService,
} from "app/models/shopify.server/carrierService";

export const CARRIER_SERVICE_NAME = "Quali8 Delivery";

export const carrierCallbackUrl = () =>
  `${(process.env.SHOPIFY_APP_URL ?? "").replace(/\/$/, "")}/api/carrier/rates`;

export type CarrierSetupStatus =
  | { state: "registered"; id: string; callbackUrl: string }
  | { state: "unsupported"; message: string }
  | { state: "scope-missing"; message: string }
  | { state: "error"; message: string };

const looksLikeScopeError = (message: string) =>
  /access denied|scope|permission|not approved/i.test(message);

const looksLikePlanError = (message: string) =>
  /carrier.calculated|plan|not (?:available|enabled|supported)|third.party/i.test(message);

/**
 * Registers (or repairs) the app's carrier service on the shop and records
 * its GID. Shopify rejects the create on plans without carrier-calculated
 * shipping (Advanced, Plus, or any plan billed annually), and on installs
 * without the write_shipping scope; both are reported as statuses rather
 * than thrown so the admin page can explain what to do.
 */
export async function setupCarrierService(
  db: PrismaClient,
  graphql: AdminGraphqlClient,
  shop: string,
): Promise<CarrierSetupStatus> {
  const callbackUrl = carrierCallbackUrl();
  if (!process.env.SHOPIFY_APP_URL) {
    return { state: "error", message: "SHOPIFY_APP_URL is not set" };
  }

  const input = {
    name: CARRIER_SERVICE_NAME,
    callbackUrl,
    active: true,
    supportsServiceDiscovery: true,
  };

  try {
    const existing = (await getCarrierServices(graphql)).find(
      (service) => service.name === CARRIER_SERVICE_NAME,
    );

    let id: string;
    if (existing && existing.callbackUrl === callbackUrl && existing.active) {
      id = existing.id;
    } else if (existing) {
      id = (await updateCarrierService(graphql, { ...input, id: existing.id })).id;
    } else {
      id = (await createCarrierService(graphql, input)).id;
    }

    await db.shopifyStore.update({ where: { shop }, data: { carrierServiceId: id } });
    return { state: "registered", id, callbackUrl };
  } catch (error) {
    const message =
      error instanceof CarrierServiceError
        ? error.userErrors[0]?.message ?? error.message
        : error instanceof Error
          ? error.message
          : "Unknown error";
    console.error("Carrier service setup failed:", message);
    await db.shopifyStore
      .update({ where: { shop }, data: { carrierServiceId: null } })
      .catch(() => undefined);
    if (looksLikeScopeError(message)) return { state: "scope-missing", message };
    if (looksLikePlanError(message)) return { state: "unsupported", message };
    return { state: "error", message };
  }
}
