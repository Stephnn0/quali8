import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type {
  DeliveryConfig,
  DeliveryZoneRow,
} from "app/components/Delivery/types";
import { matchZone, normalizeZip, parseZipList } from "./deliveryZones";

const toRow = (zone: {
  id: number;
  name: string;
  zipCodes: string[];
  price: number | null;
  message: string | null;
  active: boolean;
}): DeliveryZoneRow => ({
  id: zone.id,
  name: zone.name,
  zipCodes: zone.zipCodes,
  price: zone.price,
  message: zone.message,
  active: zone.active,
});

/** Master toggle + every zone, for the admin page. */
export async function loadDeliveryConfig(
  db: PrismaClient,
  shop: string,
): Promise<DeliveryConfig> {
  const [store, zones] = await Promise.all([
    db.shopifyStore.findUnique({
      where: { shop },
      select: { deliveryCheckEnabled: true },
    }),
    db.deliveryZone.findMany({
      where: { shop },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    }),
  ]);
  return {
    enabled: store?.deliveryCheckEnabled ?? false,
    zones: zones.map(toRow),
  };
}

// --- Admin mutations ---------------------------------------------------------

export const deliveryActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set-delivery-check"), enabled: z.boolean() }),
  z.object({
    action: z.literal("save-zone"),
    id: z.number().int().positive().nullable(),
    name: z.string().trim().min(1).max(60),
    zipCodes: z.string().max(20000),
    price: z.number().min(0).nullable(),
    message: z.string().trim().max(160).nullable(),
    active: z.boolean(),
  }),
  z.object({ action: z.literal("delete-zone"), id: z.number().int().positive() }),
]);

export type DeliveryActionBody = z.infer<typeof deliveryActionSchema>;

export async function runDeliveryAction(input: {
  db: PrismaClient;
  shop: string;
  body: DeliveryActionBody;
}): Promise<{ code: string; errors: Array<{ message: string }> | null }> {
  const { db, shop, body } = input;

  switch (body.action) {
    case "set-delivery-check":
      await db.shopifyStore.update({
        where: { shop },
        data: { deliveryCheckEnabled: body.enabled },
      });
      return { code: "delivery-check-updated", errors: null };

    case "save-zone": {
      const zipCodes = parseZipList(body.zipCodes);
      if (zipCodes.length === 0) {
        return {
          code: "error",
          errors: [{ message: "Add at least one zip or postal code" }],
        };
      }
      const data = {
        name: body.name,
        zipCodes,
        price: body.price,
        message: body.message || null,
        active: body.active,
      };
      if (body.id === null) {
        const position = await db.deliveryZone.count({ where: { shop } });
        await db.deliveryZone.create({ data: { ...data, position, shop } });
      } else {
        const owned = await db.deliveryZone.findFirst({
          where: { id: body.id, shop },
          select: { id: true },
        });
        if (!owned) return { code: "error", errors: [{ message: "Zone not found" }] };
        await db.deliveryZone.update({ where: { id: owned.id }, data });
      }
      return { code: "zone-saved", errors: null };
    }

    case "delete-zone":
      await db.deliveryZone.deleteMany({ where: { id: body.id, shop } });
      return { code: "zone-deleted", errors: null };
  }
}

// --- Storefront check --------------------------------------------------------

export type DeliveryCheckResult = {
  enabled: boolean;
  zip: string;
  deliverable: boolean;
  zone: { name: string; price: number | null; message: string | null } | null;
};

/**
 * Whether the shop delivers to `zip`, and the matching zone's price/message.
 * `ignoreSwitch` matches the zones even while the merchant's checker switch
 * is off (the cart block's alcohol local-only rule needs the answer anyway);
 * `enabled` still reports the switch.
 */
export async function checkDelivery(
  db: PrismaClient,
  shop: string,
  rawZip: string,
  options: { ignoreSwitch?: boolean } = {},
): Promise<DeliveryCheckResult> {
  const zip = normalizeZip(rawZip);
  const store = await db.shopifyStore.findUnique({
    where: { shop },
    select: { deliveryCheckEnabled: true },
  });
  const enabled = Boolean(store?.deliveryCheckEnabled);
  if ((!enabled && !options.ignoreSwitch) || !zip) {
    return { enabled, zip, deliverable: false, zone: null };
  }

  const zones = await db.deliveryZone.findMany({
    where: { shop, active: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { name: true, zipCodes: true, price: true, message: true },
  });
  const zone = matchZone(zones, zip);
  return {
    enabled,
    zip,
    deliverable: zone !== null,
    zone: zone ? { name: zone.name, price: zone.price, message: zone.message } : null,
  };
}

/** True when the storefront bar should show the checker at all. */
export async function deliveryCheckAvailable(
  db: PrismaClient,
  shop: string,
): Promise<boolean> {
  const store = await db.shopifyStore.findUnique({
    where: { shop },
    select: { deliveryCheckEnabled: true },
  });
  if (!store?.deliveryCheckEnabled) return false;
  const active = await db.deliveryZone.count({ where: { shop, active: true } });
  return active > 0;
}
