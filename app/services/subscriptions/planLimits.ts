/**
 * Plan limits: pure helpers shared by the gatekeeper (admin), the storefront
 * proxies, and the discount sync. A limit of `null` means unlimited.
 */

/** True when the shop has used up the limit. Unknown amounts count as zero. */
export function limitReached(
  limit: number | null | undefined,
  amount: number | null | undefined,
): boolean {
  if (limit === null || limit === undefined) return false;
  return (amount ?? 0) >= limit;
}

/** How many more the shop may add; null when unlimited. */
export function remainingUnderLimit(
  limit: number | null | undefined,
  amount: number,
): number | null {
  if (limit === null || limit === undefined) return null;
  return Math.max(0, limit - amount);
}

/**
 * The bundles that stay live under the plan's limit: the oldest ones (lowest
 * ids), so a shop that downgrades keeps its first bundle rather than a random
 * one. The result keeps the input order.
 */
export function applyBundleLimit<T extends { id: number }>(
  bundles: T[],
  limit: number | null | undefined,
): T[] {
  if (limit === null || limit === undefined) return bundles;
  const allowed = new Set(
    [...bundles]
      .sort((a, b) => a.id - b.id)
      .slice(0, Math.max(0, limit))
      .map((bundle) => bundle.id),
  );
  return bundles.filter((bundle) => allowed.has(bundle.id));
}

/** Midnight UTC on the first day of `now`'s month — the signup cap's window. */
export function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
