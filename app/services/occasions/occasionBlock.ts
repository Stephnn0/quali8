/**
 * Copy and behaviour of the Occasions + Gifts product-page block. Pure —
 * shared by the Occasions admin card, the storefront proxy, and tests.
 */

export type OccasionBlockSettings = {
  heading: string;
  subheading: string;
  /** Occasion chips shown before "Other occasions" (in-season first). */
  suggestedCount: number;
  otherLabel: string;
  pickerTitle: string;
  /** "{occasion}" is replaced with the occasion's name. */
  giftsHeading: string;
  giftsSubtext: string;
  changeLabel: string;
  /** Add the product being viewed together with the gift. */
  pairWithProduct: boolean;
  addLabel: string;
  addingLabel: string;
  addedLabel: string;
  afterAdd: "stay" | "cart";
  giftLimit: number;
  showNowBadge: boolean;
  nowLabel: string;
  emptyText: string;
  /** Keep the chosen occasion across pages and prefill the cart's Options step. */
  rememberChoice: boolean;
};

export const MAX_TEXT = 120;
export const MIN_SUGGESTED = 1;
export const MAX_SUGGESTED = 6;
export const MIN_GIFTS = 2;
export const MAX_GIFTS = 12;

export const defaultOccasionBlockSettings = (): OccasionBlockSettings => ({
  heading: "Shopping for an occasion?",
  subheading: "Pick one and we'll suggest the perfect add-on.",
  suggestedCount: 3,
  otherLabel: "Other occasions",
  pickerTitle: "Which occasion?",
  giftsHeading: "Gifts for {occasion}",
  giftsSubtext: "Add one to go with this item.",
  changeLabel: "Change occasion",
  pairWithProduct: true,
  addLabel: "Add both to cart",
  addingLabel: "Adding…",
  addedLabel: "Added ✓",
  afterAdd: "stay",
  giftLimit: 8,
  showNowBadge: true,
  nowLabel: "Now",
  emptyText: "No gift picks for this occasion yet.",
  rememberChoice: true,
});

const TEXT_KEYS = [
  "heading", "subheading", "otherLabel", "pickerTitle", "giftsHeading", "giftsSubtext",
  "changeLabel", "addLabel", "addingLabel", "addedLabel", "nowLabel", "emptyText",
] as const;

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Clamp untrusted input; blank text falls back to the default so the block never shows nothing. */
export function sanitizeOccasionBlockSettings(
  input: Partial<OccasionBlockSettings> | null | undefined,
): OccasionBlockSettings {
  const base = defaultOccasionBlockSettings();
  if (!input) return base;
  const out: OccasionBlockSettings = { ...base };
  for (const key of TEXT_KEYS) {
    const value = String(input[key] ?? "").trim().slice(0, MAX_TEXT);
    // Heading, subheading, and subtext may be intentionally empty.
    const optional = key === "subheading" || key === "giftsSubtext" || key === "heading";
    out[key] = value || (optional && typeof input[key] === "string" ? "" : base[key]);
  }
  out.suggestedCount = clampInt(input.suggestedCount, MIN_SUGGESTED, MAX_SUGGESTED, base.suggestedCount);
  out.giftLimit = clampInt(input.giftLimit, MIN_GIFTS, MAX_GIFTS, base.giftLimit);
  out.pairWithProduct = typeof input.pairWithProduct === "boolean" ? input.pairWithProduct : base.pairWithProduct;
  out.showNowBadge = typeof input.showNowBadge === "boolean" ? input.showNowBadge : base.showNowBadge;
  out.rememberChoice = typeof input.rememberChoice === "boolean" ? input.rememberChoice : base.rememberChoice;
  out.afterAdd = input.afterAdd === "cart" ? "cart" : "stay";
  return out;
}

export type StorefrontOccasion = { slug: string; name: string; icon: string | null; inSeason: boolean };

/** The chips to suggest first: in-season occasions, then the merchant's order, capped. */
export function suggestOccasions<T extends { inSeason: boolean }>(occasions: T[], count: number): T[] {
  const inSeason = occasions.filter((o) => o.inSeason);
  const rest = occasions.filter((o) => !o.inSeason);
  return inSeason.concat(rest).slice(0, Math.max(0, count));
}
