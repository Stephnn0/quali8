/**
 * Timed delivery windows ("Before 12:00 PM", "After 3:00 PM", "By 10:00 AM")
 * a shopper can add to a delivery for a surcharge on top of the zone price.
 * Pure — no server imports, unit tested. The storefront script and the
 * carrier callback agree on a window through its `code` ("before:12:00").
 */
import { formatTime12, isValidTime } from "./shopTime";

export const TIME_WINDOW_KINDS = ["before", "after", "by"] as const;
export type TimeWindowKind = (typeof TIME_WINDOW_KINDS)[number];

export type TimeWindow = {
  kind: TimeWindowKind;
  /** "HH:MM" 24h, shop time. */
  time: string;
  /** Surcharge in the shop currency; 0 = no extra charge. */
  price: number;
  active: boolean;
};

export type TimeWindowRow = TimeWindow & { id: number; position: number };

export const MAX_TIME_WINDOWS = 12;
export const MAX_TIME_WINDOW_PRICE = 10_000;

/** The line item property carrying the shopper's choice to the carrier callback. */
export const TIMED_PROPERTY = "_Timed delivery";

export const KIND_LABELS: Record<TimeWindowKind, string> = {
  before: "Before",
  after: "After",
  by: "By",
};

export const isTimeWindowKind = (value: unknown): value is TimeWindowKind =>
  typeof value === "string" && (TIME_WINDOW_KINDS as readonly string[]).includes(value);

/** "Before 12:00 PM" */
export const windowLabel = (window: Pick<TimeWindow, "kind" | "time">): string =>
  `${KIND_LABELS[window.kind]} ${formatTime12(window.time)}`;

/** Stable identifier shared with the storefront: "before:12:00". */
export const windowCode = (window: Pick<TimeWindow, "kind" | "time">): string =>
  `${window.kind}:${window.time}`;

export function parseWindowCode(code: unknown): { kind: TimeWindowKind; time: string } | null {
  if (typeof code !== "string") return null;
  const [kind, time] = code.split(":", 1).concat(code.slice(code.indexOf(":") + 1));
  if (!isTimeWindowKind(kind) || !isValidTime(time) || code.indexOf(":") === -1) return null;
  return { kind, time };
}

/** The active window a shopper's code points at, or null when it no longer exists. */
export function findWindow<T extends TimeWindow>(windows: T[], code: unknown): T | null {
  const parsed = parseWindowCode(code);
  if (!parsed) return null;
  return windows.find((w) => w.active && w.kind === parsed.kind && w.time === parsed.time) ?? null;
}

/** Clamp untrusted input into a window; null when it can't be one. */
export function sanitizeTimeWindow(input: Partial<TimeWindow> | null | undefined): TimeWindow | null {
  if (!input || !isTimeWindowKind(input.kind) || !isValidTime(input.time)) return null;
  const price = Number(input.price);
  return {
    kind: input.kind,
    time: input.time,
    price: Number.isFinite(price) ? Math.min(MAX_TIME_WINDOW_PRICE, Math.max(0, Math.round(price * 100) / 100)) : 0,
    active: input.active !== false,
  };
}

/** Sanitised, deduped by code, capped — in the order given. */
export function sanitizeTimeWindows(input: unknown): TimeWindow[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: TimeWindow[] = [];
  for (const raw of input) {
    const window = sanitizeTimeWindow(raw as Partial<TimeWindow>);
    if (!window) continue;
    const code = windowCode(window);
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(window);
    if (out.length >= MAX_TIME_WINDOWS) break;
  }
  return out;
}
