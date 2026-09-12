/** Whole days from today (UTC) to an ISO yyyy-mm-dd date, never negative. */
export function daysAway(isoDate: string): number {
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.max(
    0,
    Math.round((Date.parse(isoDate + "T00:00:00Z") - today) / 86_400_000),
  );
}

export const prettyDate = (isoDate: string) =>
  new Date(isoDate + "T00:00:00Z").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/** "11-24 → 11-30" from two ISO days. */
export const windowLabel = (start: string, end: string) =>
  `${start.slice(5)} → ${end.slice(5)}`;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Default show window for a scheduled theme block: the two weeks up to a
 * sales date, or, with no date, today through the next 30 days.
 */
export function scheduleWindow(specialDateDate?: string): {
  start: string;
  end: string;
} {
  if (specialDateDate) {
    const start = new Date(specialDateDate + "T00:00:00Z");
    start.setUTCDate(start.getUTCDate() - 14);
    return { start: isoDay(start), end: specialDateDate };
  }
  const start = new Date();
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 30);
  return { start: isoDay(start), end: isoDay(end) };
}
