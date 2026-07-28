import type { PrismaClient } from "@prisma/client";
import { getManyShippingDiscountActionsNotCount } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import { getCustomersWithQualifiers } from "app/models/app.server/customers/customer.server";

/**
 * A shipping reward the storefront progress bar can render.
 *
 * `threshold` is the minimum cart subtotal (in the shop's MAJOR currency unit,
 * e.g. dollars) required to unlock the reward. The client converts this to the
 * same unit as the live cart (`cart.js` reports cents) before comparing.
 */
export type ShippingOffer = {
  threshold: number;
  /**
   * `free_shipping` → discount fully covers shipping (percentage of 100).
   * `percentage_off` → `value` is a percent off the shipping rate.
   * `amount_off` → `value` is a fixed amount off (shop currency, major unit).
   */
  rewardType: "free_shipping" | "percentage_off" | "amount_off";
  value: number;
};

/**
 * Maps the discount config (`type` + `value`) to a structured reward the
 * theme can localise. Currency formatting for `amount_off` is left to the
 * client, which has the shop's money format.
 */
function toRewardType(
  type: "percentage" | "fixed",
  value: number,
): ShippingOffer["rewardType"] {
  if (type === "percentage") {
    return value >= 100 ? "free_shipping" : "percentage_off";
  }
  return "amount_off";
}

/**
 * Builds the candidate `shopifyId`s to match a logged-in customer against the
 * `Customers` table. The App Proxy hands us a bare numeric id, while we store
 * the Shopify GID (`gid://shopify/Customer/<id>`); match both to be safe.
 */
function customerIdCandidates(loggedInCustomerId: string): string[] {
  const numericId = loggedInCustomerId.trim();
  if (!numericId) return [];
  return [`gid://shopify/Customer/${numericId}`, numericId];
}

/**
 * Returns the shipping reward offers a given shopper qualifies for, sorted by
 * threshold ascending (easiest to unlock first). Pure data access only — no
 * Request/Response handling — so it can be unit-tested in isolation.
 *
 * Eligibility: an ENABLED offer with a minimum cart value applies when it
 * targets all customers, OR when the logged-in customer belongs to one of the
 * offer's targeted audiences (`qualifierIds`). Guests (or customers we have not
 * synced) see only the all-customer offers.
 */
export async function selectEligibleOffers(
  db: PrismaClient,
  shop: string,
  loggedInCustomerId: string | null,
): Promise<ShippingOffer[]> {
  const actions = await getManyShippingDiscountActionsNotCount(
    {
      where: {
        shop,
        shippingDiscountState: "ENABLED",
        isMinimumCartValueEnabled: true,
      },
    },
    db,
  );

  // Audience ids (as strings, to match the String[] `qualifierIds`) the shopper
  // belongs to. Empty for guests / unsynced customers.
  let customerQualifierIds = new Set<string>();

  if (loggedInCustomerId) {
    const candidates = customerIdCandidates(loggedInCustomerId);
    if (candidates.length) {
      const customers = await getCustomersWithQualifiers(
        { shop, shopifyIds: candidates },
        db,
      );
      customerQualifierIds = new Set(
        customers.flatMap((customer) =>
          customer.qualifiers.map((qualifier) => String(qualifier.id)),
        ),
      );
    }
  }

  const offers: ShippingOffer[] = [];

  for (const action of actions) {
    const targetsThisShopper =
      action.appliesToAllCustomers ||
      action.qualifierIds.some((id) => customerQualifierIds.has(id));

    if (!targetsThisShopper) continue;
    if (action.minimumCartValue == null) continue;

    offers.push({
      threshold: action.minimumCartValue,
      rewardType: toRewardType(action.type, action.value),
      value: action.value,
    });
  }

  return offers.sort((a, b) => a.threshold - b.threshold);
}
