/**
 * Pure date rules for the delivery / pickup calendar. No server imports —
 * unit tested. Dates are ISO `yyyy-mm-dd` strings interpreted as calendar
 * days (no time zone maths): the storefront passes the shopper's local
 * "today", the admin stores what the merchant typed.
 */

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MethodSchedule = {
  /** Weekdays never offered (0 = Sunday). */
  blockedWeekdays: Weekday[];
  /** Specific days never offered, ISO yyyy-mm-dd. */
  blockedDates: string[];
  /** Earliest offered day is today + leadDays (0 = same day). */
  leadDays: number;
  /** Latest offered day is today + maxDaysAhead. */
  maxDaysAhead: number;
};

export type DeliverySchedule = {
  /** Show the calendar in the cart at all. */
  enabled: boolean;
  /** Shoppers must pick a date before continuing. */
  requireDate: boolean;
  delivery: MethodSchedule;
  pickup: MethodSchedule;
};

export const WEEKDAYS: Array<{ value: Weekday; label: string; short: string }> = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export const MAX_LEAD_DAYS = 60;
export const MAX_DAYS_AHEAD = 365;

export const defaultMethodSchedule = (): MethodSchedule => ({
  blockedWeekdays: [],
  blockedDates: [],
  leadDays: 0,
  maxDaysAhead: 60,
});

export const defaultDeliverySchedule = (): DeliverySchedule => ({
  enabled: false,
  requireDate: true,
  delivery: defaultMethodSchedule(),
  pickup: defaultMethodSchedule(),
});

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written as yyyy-mm-dd. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(String(value ?? ""));
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Parses merchant-typed dates: commas, newlines, semicolons, or spaces; dedupes; sorted. */
export function parseDateList(text: string): string[] {
  const seen = new Set<string>();
  for (const raw of String(text ?? "").split(/[\s,;]+/)) {
    const entry = raw.trim();
    if (isIsoDate(entry)) seen.add(entry);
  }
  return Array.from(seen).sort();
}

export function weekdayOf(isoDate: string): Weekday {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/**
 * Whether `isoDate` can be chosen under `schedule`, given the shopper's
 * `today`. Invalid dates are never allowed.
 */
export function isDateAllowed(schedule: MethodSchedule, isoDate: string, today: string): boolean {
  if (!isIsoDate(isoDate) || !isIsoDate(today)) return false;
  const offset = daysBetween(today, isoDate);
  if (offset < schedule.leadDays || offset > schedule.maxDaysAhead) return false;
  if (schedule.blockedWeekdays.includes(weekdayOf(isoDate))) return false;
  if (schedule.blockedDates.includes(isoDate)) return false;
  return true;
}

/** The first allowed day on or after today + leadDays, or null when none within the window. */
export function firstAvailableDate(schedule: MethodSchedule, today: string): string | null {
  if (!isIsoDate(today)) return null;
  for (let offset = schedule.leadDays; offset <= schedule.maxDaysAhead; offset += 1) {
    const candidate = addDays(today, offset);
    if (isDateAllowed(schedule, candidate, today)) return candidate;
  }
  return null;
}

/** Clamp and dedupe untrusted input into a MethodSchedule. */
export function sanitizeMethodSchedule(input: Partial<MethodSchedule> | null | undefined): MethodSchedule {
  const base = defaultMethodSchedule();
  if (!input) return base;
  const weekdays = Array.from(
    new Set((input.blockedWeekdays ?? []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)),
  ).sort() as Weekday[];
  const dates = Array.from(new Set((input.blockedDates ?? []).filter(isIsoDate))).sort();
  const lead = Number.isInteger(input.leadDays) ? Math.min(MAX_LEAD_DAYS, Math.max(0, Number(input.leadDays))) : base.leadDays;
  const max = Number.isInteger(input.maxDaysAhead) ? Math.min(MAX_DAYS_AHEAD, Math.max(lead, Number(input.maxDaysAhead))) : base.maxDaysAhead;
  return { blockedWeekdays: weekdays, blockedDates: dates, leadDays: lead, maxDaysAhead: Math.max(max, lead) };
}
