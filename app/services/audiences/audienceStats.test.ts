import { describe, expect, it } from "vitest";
import {
  computeAudienceStats,
  summarizeAudiences,
  type AudienceMember,
} from "./audienceStats";

const member = (
  amountSpent: string | null,
  orderCount: number | null,
  country: string | null,
  shopifyId = Math.random().toString(),
): AudienceMember & { shopifyId: string } => ({
  shopifyId,
  amountSpent,
  orderCount,
  country,
});

describe("computeAudienceStats", () => {
  it("aggregates revenue, orders, and countries", () => {
    const stats = computeAudienceStats([
      member("100.50", 3, "United States"),
      member("49.50", 1, "United States"),
      member("0", 0, "Canada"),
    ]);

    expect(stats).toEqual({
      memberCount: 3,
      totalRevenue: 150,
      averageSpend: 50,
      averageOrders: 1.3,
      topCountries: [
        { country: "United States", count: 2, share: 0.67 },
        { country: "Canada", count: 1, share: 0.33 },
      ],
    });
  });

  it("survives malformed and missing data", () => {
    const stats = computeAudienceStats([
      member("not-a-number", null, null),
      member(null, 2, ""),
    ]);

    expect(stats.memberCount).toBe(2);
    expect(stats.totalRevenue).toBe(0);
    expect(stats.averageOrders).toBe(1);
    expect(stats.topCountries).toEqual([]);
  });

  it("returns zeros for an empty audience", () => {
    expect(computeAudienceStats([])).toEqual({
      memberCount: 0,
      totalRevenue: 0,
      averageSpend: 0,
      averageOrders: 0,
      topCountries: [],
    });
  });

  it("caps topCountries at five entries", () => {
    const stats = computeAudienceStats(
      ["A", "B", "C", "D", "E", "F"].map((c) => member("1", 1, c)),
    );
    expect(stats.topCountries).toHaveLength(5);
  });
});

describe("summarizeAudiences", () => {
  it("deduplicates customers across audiences", () => {
    const shared = member("10", 1, "US", "gid://shopify/Customer/1");
    const summary = summarizeAudiences([
      { customers: [shared, member("20", 2, "US", "gid://shopify/Customer/2")] },
      { customers: [shared] },
    ]);

    expect(summary).toEqual({
      audienceCount: 2,
      reachedCustomers: 2,
      totalRevenue: 30,
    });
  });
});
