/**
 * Pure helpers for the Subscribe Boost popup: input normalisation for the
 * storefront signup and the aggregates the feature page shows.
 */

export const MAX_EMAIL_LENGTH = 254;
export const MAX_NAME_LENGTH = 80;
export const MAX_TAGS = 10;

/** The tag every popup subscriber gets, so they can be filtered in Shopify. */
export const POPUP_CUSTOMER_TAG = "quali8-popup";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Lower-cased, trimmed email, or null when it is not an email. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

/** Trimmed first name capped in length; empty becomes null. */
export function normalizeFirstName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
  return name || null;
}

/**
 * Comma-separated tags from the block setting: trimmed, de-duplicated,
 * capped, and always including the popup tag.
 */
export function parseCustomerTags(value: unknown): string[] {
  const raw = typeof value === "string" ? value : "";
  const tags = raw
    .split(",")
    .map((tag) => tag.trim().slice(0, 40))
    .filter((tag) => tag && !tag.includes('"'));
  const unique = Array.from(new Set([POPUP_CUSTOMER_TAG, ...tags]));
  return unique.slice(0, MAX_TAGS);
}

export type DailyStat = {
  day: string;
  views: number;
  dismissals: number;
  subscribes: number;
};

export type SubscribeSummary = {
  /** Popup shown / closed / converted within the window. */
  views: number;
  dismissals: number;
  subscribes: number;
  /** subscribes ÷ views as a percentage, 0 when nothing was shown. */
  conversionRate: number;
  /** One entry per day in the window, oldest first, zero-filled. */
  days: DailyStat[];
};

const shiftDay = (day: string, delta: number): string => {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return date.toISOString().slice(0, 10);
};

/**
 * Totals and a zero-filled daily series for the `windowDays` days ending on
 * `today` (inclusive). Rows outside the window are ignored.
 */
export function summarizeDailyStats(
  rows: DailyStat[],
  today: string,
  windowDays = 30,
): SubscribeSummary {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const days: DailyStat[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const day = shiftDay(today, -offset);
    const row = byDay.get(day);
    days.push({
      day,
      views: row?.views ?? 0,
      dismissals: row?.dismissals ?? 0,
      subscribes: row?.subscribes ?? 0,
    });
  }
  const views = days.reduce((sum, row) => sum + row.views, 0);
  const dismissals = days.reduce((sum, row) => sum + row.dismissals, 0);
  const subscribes = days.reduce((sum, row) => sum + row.subscribes, 0);
  return {
    views,
    dismissals,
    subscribes,
    conversionRate: views ? Math.round((subscribes / views) * 1000) / 10 : 0,
    days,
  };
}

/** `gid://shopify/Customer/123` → `123`; anything else → null. */
export function customerAdminId(gid: string | null | undefined): string | null {
  const match = /^gid:\/\/shopify\/Customer\/(\d+)$/.exec(gid ?? "");
  return match ? match[1] : null;
}
