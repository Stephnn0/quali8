import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import {
  MAX_TIME_WINDOWS,
  MAX_TIME_WINDOW_PRICE,
  TIME_WINDOW_KINDS,
  sanitizeTimeWindows,
  windowCode,
  windowLabel,
  type TimeWindowRow,
} from "./timedDelivery";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The "Timed delivery" card saves the whole list at once. */
export const timeWindowsActionSchema = z.object({
  action: z.literal("save-time-windows"),
  windows: z
    .array(
      z.object({
        kind: z.enum(TIME_WINDOW_KINDS),
        time: z.string().regex(TIME),
        price: z.number().min(0).max(MAX_TIME_WINDOW_PRICE),
        active: z.boolean(),
      }),
    )
    .max(MAX_TIME_WINDOWS),
});

export type TimeWindowsActionBody = z.infer<typeof timeWindowsActionSchema>;

const select = { id: true, kind: true, time: true, price: true, active: true, position: true } as const;

export async function loadTimeWindows(db: PrismaClient, shop: string): Promise<TimeWindowRow[]> {
  const rows = await db.deliveryTimeWindow.findMany({
    where: { shop },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select,
  });
  return rows as TimeWindowRow[];
}

/** Replaces the shop's windows with the list given, keeping their order. */
export async function saveTimeWindows(
  db: PrismaClient,
  shop: string,
  body: TimeWindowsActionBody,
): Promise<{ code: string; errors: Array<{ message: string }> | null }> {
  const windows = sanitizeTimeWindows(body.windows);
  await db.$transaction([
    db.deliveryTimeWindow.deleteMany({ where: { shop } }),
    ...(windows.length
      ? [
          db.deliveryTimeWindow.createMany({
            data: windows.map((window, position) => ({ ...window, position, shop })),
          }),
        ]
      : []),
  ]);
  return { code: "time-windows-saved", errors: null };
}

/** What the storefront shows in the dropdown: code, label, surcharge. */
export type StorefrontTimeWindow = { code: string; label: string; price: number };

export async function loadActiveTimeWindows(db: PrismaClient, shop: string): Promise<StorefrontTimeWindow[]> {
  const rows = await db.deliveryTimeWindow.findMany({
    where: { shop, active: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { kind: true, time: true, price: true },
  });
  return (rows as Array<{ kind: TimeWindowRow["kind"]; time: string; price: number }>).map((row) => ({
    code: windowCode(row),
    label: windowLabel(row),
    price: row.price,
  }));
}
