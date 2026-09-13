/**
 * Clock helpers in the shop's time zone. No server imports — unit tested.
 * Times are "HH:MM" 24-hour strings; dates are ISO yyyy-mm-dd. Both are
 * read off `Intl` so the maths is the same in Node and in the storefront
 * script that mirrors it.
 */

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidTime = (value: unknown): value is string =>
  typeof value === "string" && TIME.test(value);

export function isValidTimezone(zone: unknown): zone is string {
  if (typeof zone !== "string" || !zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export type ShopClock = {
  /** The zone the values are in ("UTC" when the shop's is unknown). */
  timezone: string;
  /** Today's date in the shop, yyyy-mm-dd. */
  date: string;
  /** The shop's wall-clock time, HH:MM (24h). */
  time: string;
};

/** The shop's current date and time, falling back to UTC for an unknown zone. */
export function shopNow(timezone: string | null | undefined, at: Date = new Date()): ShopClock {
  const zone = isValidTimezone(timezone) ? timezone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    timezone: zone,
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}

/** "14:30" → "2:30 PM"; invalid input comes back unchanged. */
export function formatTime12(value: string): string {
  if (!isValidTime(value)) return value;
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Minutes since midnight for ordering; -1 for invalid input. */
export const minutesOf = (value: string): number =>
  isValidTime(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : -1;
