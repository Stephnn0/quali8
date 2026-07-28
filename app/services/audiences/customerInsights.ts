/**
 * Pure aggregation for the store-wide "Customer insights" section on the
 * Audiences index. Input is a sample of the most recent customers fetched
 * from Shopify (see getCustomerInsightsSample). Client-safe: no server
 * imports.
 */

export type InsightCustomer = {
  createdAt: string;
  numberOfOrders: number;
  amountSpent: number;
  country: string | null;
};

export type CountrySlice = { label: string; count: number; share: number };
export type SpendBucket = { label: string; count: number };
export type MonthPoint = { label: string; count: number };

export type CustomerInsights = {
  totalCustomers: number;
  sampleSize: number;
  /** True when the store has more customers than the sample covers. */
  sampled: boolean;
  repeatBuyerShare: number;
  averageSpend: number;
  newThisMonth: number;
  /** Top 5 countries + "Other", sorted by count desc. share is 0–1. */
  byCountry: CountrySlice[];
  spendBuckets: SpendBucket[];
  /** Last 6 calendar months, oldest first. */
  byMonth: MonthPoint[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const SPEND_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: "Never purchased", min: 0, max: 0 },
  { label: "Under $50", min: Number.MIN_VALUE, max: 50 },
  { label: "$50 – $200", min: 50, max: 200 },
  { label: "$200 – $500", min: 200, max: 500 },
  { label: "$500+", min: 500, max: Infinity },
];

function spendBucketIndex(amountSpent: number): number {
  if (amountSpent <= 0) return 0;
  if (amountSpent < 50) return 1;
  if (amountSpent < 200) return 2;
  if (amountSpent < 500) return 3;
  return 4;
}

export function computeCustomerInsights(
  customers: InsightCustomer[],
  totalCustomers: number,
  now: Date = new Date(),
): CustomerInsights {
  const sampleSize = customers.length;

  const countryCounts = new Map<string, number>();
  const spendBuckets = SPEND_BUCKETS.map(({ label }) => ({ label, count: 0 }));
  let repeatBuyers = 0;
  let totalSpend = 0;
  let newThisMonth = 0;

  // All month math in UTC — Shopify timestamps are ISO/UTC, and mixing them
  // with local getters shifts month boundaries by the server's timezone.
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth();

  // Last 6 calendar months, oldest first
  const monthKeys: string[] = [];
  const monthCounts = new Map<string, number>();
  const monthLabels = new Map<string, string>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(thisYear, thisMonth - i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    monthKeys.push(key);
    monthCounts.set(key, 0);
    monthLabels.set(
      key,
      d.toLocaleDateString("en", { month: "short", timeZone: "UTC" }),
    );
  }

  for (const customer of customers) {
    if (customer.numberOfOrders >= 2) repeatBuyers += 1;
    totalSpend += customer.amountSpent;
    spendBuckets[spendBucketIndex(customer.amountSpent)].count += 1;

    const country = customer.country?.trim();
    if (country) {
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
    }

    const created = new Date(customer.createdAt);
    if (!Number.isNaN(created.getTime())) {
      if (
        created.getUTCFullYear() === thisYear &&
        created.getUTCMonth() === thisMonth
      ) {
        newThisMonth += 1;
      }
      const key = `${created.getUTCFullYear()}-${created.getUTCMonth()}`;
      if (monthCounts.has(key)) {
        monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const sortedCountries = [...countryCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const top = sortedCountries.slice(0, 5);
  const otherCount =
    sortedCountries.slice(5).reduce((sum, [, count]) => sum + count, 0) +
    (sampleSize -
      sortedCountries.reduce((sum, [, count]) => sum + count, 0));

  const byCountry: CountrySlice[] = top.map(([label, count]) => ({
    label,
    count,
    share: sampleSize ? round2(count / sampleSize) : 0,
  }));
  if (otherCount > 0) {
    byCountry.push({
      label: "Other",
      count: otherCount,
      share: sampleSize ? round2(otherCount / sampleSize) : 0,
    });
  }

  return {
    totalCustomers,
    sampleSize,
    sampled: totalCustomers > sampleSize,
    repeatBuyerShare: sampleSize ? round2(repeatBuyers / sampleSize) : 0,
    averageSpend: sampleSize ? round2(totalSpend / sampleSize) : 0,
    newThisMonth,
    byCountry,
    spendBuckets,
    byMonth: monthKeys.map((key) => ({
      label: monthLabels.get(key) ?? "",
      count: monthCounts.get(key) ?? 0,
    })),
  };
}
