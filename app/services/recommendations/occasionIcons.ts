/**
 * Emoji icons for occasion tiles. Client-safe. The storefront block keeps
 * its own copy of the keyword map so it can fall back for occasions saved
 * before icons existed.
 */

const KEYWORDS: Array<[RegExp, string]> = [
  [/valentine|love|romance/, "💝"],
  [/mother|mom|mum/, "🌷"],
  [/father|dad/, "👔"],
  [/christmas|xmas|holiday/, "🎄"],
  [/birthday/, "🎂"],
  [/anniversar/, "💍"],
  [/sympathy|condolence|memorial|funeral/, "🕊️"],
  [/wedding|bridal|engagement/, "💐"],
  [/baby|shower|newborn/, "🍼"],
  [/graduat/, "🎓"],
  [/easter|spring/, "🐣"],
  [/halloween/, "🎃"],
  [/thanksgiving|harvest|autumn|fall/, "🍂"],
  [/new year|nye/, "🎉"],
  [/get well|recover/, "🌼"],
  [/housewarming|new home|home/, "🏡"],
  [/retire/, "🥂"],
  [/thank/, "🙏"],
  [/congrat|promotion|celebrat/, "🥳"],
  [/teacher|school/, "🍎"],
  [/corporate|business|client/, "💼"],
  [/summer|beach/, "☀️"],
  [/winter|snow/, "❄️"],
  [/just because|any|every/, "✨"],
];

export const DEFAULT_OCCASION_ICON = "🎁";

/** Best-guess emoji for an occasion name; the gift box when nothing fits. */
export function suggestOccasionIcon(name: string): string {
  const needle = name.toLowerCase();
  for (const [pattern, icon] of KEYWORDS) {
    if (pattern.test(needle)) return icon;
  }
  return DEFAULT_OCCASION_ICON;
}

/** Quick picks shown under the icon field in the admin. */
export const OCCASION_ICON_CHOICES = [
  "🎁", "💝", "🌷", "👔", "🎄", "🎂", "💍", "🕊️", "💐", "🍼",
  "🎓", "🐣", "🎃", "🍂", "🎉", "🌼", "🏡", "🥂", "🙏", "🥳",
  "🍎", "💼", "☀️", "❄️", "✨", "🌹", "🍫", "🕯️", "🧸", "🍷",
];
