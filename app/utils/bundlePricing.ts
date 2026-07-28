/**
 * Pure pricing math for product bundles, shared by the admin UI (live
 * preview) and the app-proxy service (storefront payload). No server-only
 * imports — keep it that way so client components can use it.
 *
 * All money inputs/outputs are in the shop's MAJOR currency unit (e.g.
 * dollars). Internally the math runs in integer cents to avoid float drift.
 */

export type BundlePricingItem = {
  /** Unit price in major currency units. */
  price: number;
  quantity: number;
};

export type BundlePricing = {
  /** Sum of `price * quantity` across items, major units. */
  originalTotal: number;
  /** The percent actually applied — clamped to `[0, 100]`. */
  discountPercent: number;
  /** Money taken off `originalTotal`, major units. */
  discountAmount: number;
  /** `originalTotal - discountAmount`, never negative. */
  finalTotal: number;
  /** Whole-number percent saved (0–100). */
  savingsPercent: number;
};

function toCents(major: number): number {
  return Math.round(major * 100);
}

function toMajor(cents: number): number {
  return Math.round(cents) / 100;
}

/** Clamps a requested percent to `[0, 100]`; non-finite values become 0. */
export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(Math.max(percent, 0), 100);
}

/** A single unit price with the bundle percent applied, major units. */
export function applyPercentDiscount(price: number, percent: number): number {
  const priceCents = Number.isFinite(price) ? toCents(price) : 0;
  const discounted = priceCents * (1 - clampPercent(percent) / 100);
  return toMajor(discounted);
}

export function computeBundlePricing(
  items: BundlePricingItem[],
  discountPercent: number,
): BundlePricing {
  const originalCents = items.reduce((sum, item) => {
    const price = Number.isFinite(item.price) ? item.price : 0;
    const quantity =
      Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 0;
    return sum + toCents(price) * quantity;
  }, 0);

  const percent = clampPercent(discountPercent);
  const discountCents = Math.round((originalCents * percent) / 100);

  const finalCents = originalCents - discountCents;
  const savingsPercent =
    originalCents > 0 ? Math.round((discountCents / originalCents) * 100) : 0;

  return {
    originalTotal: toMajor(originalCents),
    discountPercent: percent,
    discountAmount: toMajor(discountCents),
    finalTotal: toMajor(finalCents),
    savingsPercent,
  };
}
