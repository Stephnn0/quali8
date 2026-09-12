/**
 * Fixed vocabularies for Smart Recommendations (v1 keeps these built-in
 * rather than merchant-configurable). Client-safe: no server imports.
 *
 * Tag conventions merchants can use on products to widen the candidate pool
 * beyond an occasion's curated list:
 *   q8:occasion:<occasion-slug>
 *   q8:recipient:<recipient-slug>
 *   q8:season:<spring|summer|fall|winter>
 */

export const RECIPIENTS = [
  { slug: "for-her", label: "For her" },
  { slug: "for-him", label: "For him" },
  { slug: "for-mom", label: "For mom" },
  { slug: "for-friend", label: "For a friend" },
  { slug: "corporate", label: "Corporate" },
] as const;

export type RecipientSlug = (typeof RECIPIENTS)[number]["slug"];

/** Price bands in the shop's currency; max null = open-ended. */
export const BUDGET_BANDS = [
  { slug: "under-50", label: "Under $50", min: 0, max: 50 },
  { slug: "50-100", label: "$50 – $100", min: 50, max: 100 },
  { slug: "100-200", label: "$100 – $200", min: 100, max: 200 },
  { slug: "200-plus", label: "$200+", min: 200, max: null },
] as const;

export type BudgetSlug = (typeof BUDGET_BANDS)[number]["slug"];

export type Season = "spring" | "summer" | "fall" | "winter";

/** Northern-hemisphere meteorological seasons (v1 fixed). */
export function seasonForDate(date: Date): Season {
  const month = date.getUTCMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

export const TAG_PREFIX = {
  occasion: "q8:occasion:",
  recipient: "q8:recipient:",
  season: "q8:season:",
} as const;

/** Starter occasions seeded for every shop; merchants edit or delete them. */
export const DEFAULT_OCCASIONS = [
  { name: "Valentine's Day", slug: "valentines-day", icon: "💝", startMonth: 2, startDay: 1, endMonth: 2, endDay: 14 },
  { name: "Mother's Day", slug: "mothers-day", icon: "🌷", startMonth: 4, startDay: 25, endMonth: 5, endDay: 14 },
  { name: "Father's Day", slug: "fathers-day", icon: "👔", startMonth: 6, startDay: 1, endMonth: 6, endDay: 21 },
  { name: "Christmas", slug: "christmas", icon: "🎄", startMonth: 12, startDay: 1, endMonth: 12, endDay: 25 },
  { name: "Birthday", slug: "birthday", icon: "🎂", startMonth: null, startDay: null, endMonth: null, endDay: null },
  { name: "Anniversary", slug: "anniversary", icon: "💍", startMonth: null, startDay: null, endMonth: null, endDay: null },
  { name: "Sympathy", slug: "sympathy", icon: "🕊️", startMonth: null, startDay: null, endMonth: null, endDay: null },
  { name: "Just because", slug: "just-because", icon: "✨", startMonth: null, startDay: null, endMonth: null, endDay: null },
] as const;

/**
 * Whether a recurring month/day window contains `date` (UTC). Windows may
 * wrap the year end (e.g. Dec 20 – Jan 5). A window with null months is
 * always active ("Birthday").
 */
export function occasionWindowContains(
  occasion: {
    startMonth: number | null;
    startDay: number | null;
    endMonth: number | null;
    endDay: number | null;
  },
  date: Date,
): boolean {
  const { startMonth, startDay, endMonth, endDay } = occasion;
  if (!startMonth || !endMonth) return false;

  const value = (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  const start = startMonth * 100 + (startDay ?? 1);
  const end = endMonth * 100 + (endDay ?? 31);

  if (start <= end) return value >= start && value <= end;
  // Wraps the year end
  return value >= start || value <= end;
}
