import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import {
  defaultDeliverySchedule,
  sanitizeMethodSchedule,
  type DeliverySchedule,
  type Weekday,
} from "./deliverySchedule";

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
}): DeliverySchedule => ({
  enabled: row.enabled,
  requireDate: row.requireDate,
  delivery: sanitizeMethodSchedule({
    blockedWeekdays: row.deliveryBlockedWeekdays as Weekday[],
    blockedDates: row.deliveryBlockedDates,
    leadDays: row.deliveryLeadDays,
    maxDaysAhead: row.deliveryMaxDaysAhead,
  }),
  pickup: sanitizeMethodSchedule({
    blockedWeekdays: row.pickupBlockedWeekdays as Weekday[],
    blockedDates: row.pickupBlockedDates,
    leadDays: row.pickupLeadDays,
    maxDaysAhead: row.pickupMaxDaysAhead,
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
