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
