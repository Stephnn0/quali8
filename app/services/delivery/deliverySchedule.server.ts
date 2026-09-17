import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import {
  defaultDeliverySchedule,
  defaultMethodSchedule,
  sanitizeMethodSchedule,
  todayStatus,
  type DeliverySchedule,
  type MethodSchedule,
  type TodayStatus,
  type Weekday,
} from "./deliverySchedule";
import { shopNow, type ShopClock } from "./shopTime";
import { loadActiveTimeWindows, type StorefrontTimeWindow } from "./timedDelivery.server";
import { loadCartOptions } from "./cartOptions.server";
import { loadStorefrontAlcoholRules } from "./alcoholRules.server";
import { disabledStorefrontAlcoholRules, type StorefrontAlcoholRules } from "./alcoholRules";
import { defaultCartOptions, type CartOptions } from "./cartOptions";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const methodSchema = z.object({
  blockedWeekdays: z.array(z.number().int().min(0).max(6)).max(7),
  blockedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(400),
  leadDays: z.number().int().min(0).max(60),
  maxDaysAhead: z.number().int().min(0).max(365),
});

export const scheduleActionSchema = z.object({
  action: z.literal("save-schedule"),
  enabled: z.boolean(),
  requireDate: z.boolean(),
  delivery: methodSchema,
  pickup: methodSchema,
});

export type ScheduleActionBody = z.infer<typeof scheduleActionSchema>;

const todayRuleSchema = z.object({
  enabled: z.boolean(),
  cutoff: z.string().regex(TIME).nullable(),
});

/** The "Today delivery" card: same-day switch and cutoff per method. */
export const todayRulesActionSchema = z.object({
  action: z.literal("save-today-rules"),
  delivery: todayRuleSchema,
  pickup: todayRuleSchema,
});

export type TodayRulesActionBody = z.infer<typeof todayRulesActionSchema>;

const toSchedule = (row: {
  enabled: boolean;
  requireDate: boolean;
  deliveryBlockedWeekdays: number[];
  deliveryBlockedDates: string[];
  deliveryLeadDays: number;
  deliveryMaxDaysAhead: number;
  pickupBlockedWeekdays: number[];
  pickupBlockedDates: string[];
  pickupLeadDays: number;
  pickupMaxDaysAhead: number;
  deliveryTodayEnabled: boolean;
  deliveryTodayCutoff: string | null;
  pickupTodayEnabled: boolean;
  pickupTodayCutoff: string | null;
}): DeliverySchedule => ({
  enabled: row.enabled,
  requireDate: row.requireDate,
  delivery: sanitizeMethodSchedule({
    blockedWeekdays: row.deliveryBlockedWeekdays as Weekday[],
    blockedDates: row.deliveryBlockedDates,
    leadDays: row.deliveryLeadDays,
    maxDaysAhead: row.deliveryMaxDaysAhead,
    todayEnabled: row.deliveryTodayEnabled,
    todayCutoff: row.deliveryTodayCutoff,
  }),
  pickup: sanitizeMethodSchedule({
    blockedWeekdays: row.pickupBlockedWeekdays as Weekday[],
    blockedDates: row.pickupBlockedDates,
    leadDays: row.pickupLeadDays,
    maxDaysAhead: row.pickupMaxDaysAhead,
    todayEnabled: row.pickupTodayEnabled,
    todayCutoff: row.pickupTodayCutoff,
  }),
});

/** The shop's calendar rules, defaults when nothing has been saved yet. */
export async function loadDeliverySchedule(db: PrismaClient, shop: string): Promise<DeliverySchedule> {
  const row = await db.deliverySchedule.findUnique({ where: { shop } });
  return row ? toSchedule(row) : defaultDeliverySchedule();
}

export async function saveDeliverySchedule(
  db: PrismaClient,
  shop: string,
  body: ScheduleActionBody,
): Promise<{ code: string; errors: Array<{ message: string }> | null }> {
  // The calendar card doesn't carry the same-day rules; keep what's saved.
  const delivery = sanitizeMethodSchedule(body.delivery as never);
  const pickup = sanitizeMethodSchedule(body.pickup as never);
  const data = {
    enabled: body.enabled,
    requireDate: body.requireDate,
    deliveryBlockedWeekdays: delivery.blockedWeekdays,
    deliveryBlockedDates: delivery.blockedDates,
    deliveryLeadDays: delivery.leadDays,
    deliveryMaxDaysAhead: delivery.maxDaysAhead,
    pickupBlockedWeekdays: pickup.blockedWeekdays,
    pickupBlockedDates: pickup.blockedDates,
    pickupLeadDays: pickup.leadDays,
    pickupMaxDaysAhead: pickup.maxDaysAhead,
  };
  await db.deliverySchedule.upsert({
    where: { shop },
    create: { ...data, shop },
    update: data,
  });
  return { code: "schedule-saved", errors: null };
}

/** Saves the "Today delivery" card; the row is created with default calendar rules when missing. */
export async function saveTodayRules(
  db: PrismaClient,
  shop: string,
  body: TodayRulesActionBody,
): Promise<{ code: string; errors: Array<{ message: string }> | null }> {
  const data = {
    deliveryTodayEnabled: body.delivery.enabled,
    deliveryTodayCutoff: body.delivery.cutoff,
    pickupTodayEnabled: body.pickup.enabled,
    pickupTodayCutoff: body.pickup.cutoff,
  };
  await db.deliverySchedule.upsert({
    where: { shop },
    create: { ...data, shop },
    update: data,
  });
  return { code: "today-rules-saved", errors: null };
}

// --- Shop clock ----------------------------------------------------------------

/** The shop's IANA zone as synced at install (ShopifyShopData), or null. */
export async function loadShopTimezone(db: PrismaClient, shop: string): Promise<string | null> {
  const data = await db.shopifyShopData.findUnique({ where: { shop }, select: { ianaTimezone: true } });
  return data?.ianaTimezone ?? null;
}

/** Records the zone the Admin API reports, so the storefront and carrier use the same clock. */
export async function rememberShopTimezone(db: PrismaClient, shop: string, timezone: string): Promise<void> {
  await db.shopifyShopData.updateMany({ where: { shop, NOT: { ianaTimezone: timezone } }, data: { ianaTimezone: timezone } });
}

// --- Storefront payload ------------------------------------------------------

export type StorefrontSchedule = DeliverySchedule & {
  /** The shop's clock, so the cart evaluates same-day rules in the right zone. */
  clock: ShopClock;
  today: Record<"delivery" | "pickup", TodayStatus>;
  timeWindows: StorefrontTimeWindow[];
  /** What the Options step shows (or whether it shows at all). */
  options: CartOptions;
  /** Alcohol rules: age check, local delivery only, not sold alone (disabled when off). */
  alcohol: StorefrontAlcoholRules;
};

export const emptyStorefrontSchedule = (): StorefrontSchedule => ({
  ...defaultDeliverySchedule(),
  clock: shopNow(null),
  today: { delivery: "open", pickup: "open" },
  timeWindows: [],
  options: defaultCartOptions(),
  alcohol: disabledStorefrontAlcoholRules(),
});

/**
 * Everything the cart block needs for the Delivery / Pickup step: the
 * calendar rules, the shop's date and time, whether same-day is still open,
 * and the timed delivery windows on offer.
 */
export async function loadStorefrontSchedule(db: PrismaClient, shop: string): Promise<StorefrontSchedule> {
  const [schedule, timezone, timeWindows, options, alcohol] = await Promise.all([
    loadDeliverySchedule(db, shop),
    loadShopTimezone(db, shop),
    loadActiveTimeWindows(db, shop),
    loadCartOptions(db, shop),
    loadStorefrontAlcoholRules(db, shop),
  ]);
  const clock = shopNow(timezone);
  const status = (method: MethodSchedule | undefined) => todayStatus(method ?? defaultMethodSchedule(), clock.time);
  return {
    ...schedule,
    clock,
    today: { delivery: status(schedule.delivery), pickup: status(schedule.pickup) },
    timeWindows,
    options,
    alcohol,
  };
}
