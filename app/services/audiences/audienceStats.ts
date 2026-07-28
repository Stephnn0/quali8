/**
 * Pure aggregation over audience members (`Customers` rows). Membership is a
 * snapshot taken when the audience was last saved/refreshed, so everything
 * here computes from our own DB — no Shopify calls. Client-safe: no server
 * imports (used by both loaders and components).
 */

export type AudienceMember = {
  amountSpent: string | null;
  orderCount: number | null;
  country: string | null;
};

export type AudienceStats = {
  memberCount: number;
  /** Lifetime revenue represented by the members, major currency units. */
  totalRevenue: number;
  averageSpend: number;
  averageOrders: number;
  /** Up to 5, sorted by count desc. `share` is 0–1, rounded to 2 decimals. */
  topCountries: Array<{ country: string; count: number; share: number }>;
};

function parseSpent(amountSpent: string | null): number {
  const parsed = Number.parseFloat(amountSpent ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeAudienceStats(members: AudienceMember[]): AudienceStats {
  const memberCount = members.length;
  if (memberCount === 0) {
    return {
      memberCount: 0,
      totalRevenue: 0,
      averageSpend: 0,
      averageOrders: 0,
      topCountries: [],
    };
  }

  let totalRevenue = 0;
  let totalOrders = 0;
  const countryCounts = new Map<string, number>();

  for (const m of members) {
    totalRevenue += parseSpent(m.amountSpent);
    totalOrders += m.orderCount ?? 0;
    if (m.country) {
      countryCounts.set(m.country, (countryCounts.get(m.country) ?? 0) + 1);
    }
  }

  const topCountries = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({
      country,
      count,
      share: round2(count / memberCount),
    }));

  return {
    memberCount,
    totalRevenue: round2(totalRevenue),
    averageSpend: round2(totalRevenue / memberCount),
    averageOrders: round1(totalOrders / memberCount),
    topCountries,
  };
}

export type AudienceSummary = {
  audienceCount: number;
  /** Distinct customers across all audiences. */
  reachedCustomers: number;
  /** Revenue of those distinct customers (each counted once). */
  totalRevenue: number;
};

export function summarizeAudiences(
  audiences: Array<{
    customers: Array<AudienceMember & { shopifyId: string }>;
  }>,
): AudienceSummary {
  const seen = new Map<string, number>();
  for (const audience of audiences) {
    for (const m of audience.customers) {
      if (!seen.has(m.shopifyId)) {
        seen.set(m.shopifyId, parseSpent(m.amountSpent));
      }
    }
  }
  let totalRevenue = 0;
  for (const spent of seen.values()) totalRevenue += spent;

  return {
    audienceCount: audiences.length,
    reachedCustomers: seen.size,
    totalRevenue: round2(totalRevenue),
  };
}
