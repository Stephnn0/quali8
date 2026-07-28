import { describe, expect, it } from "vitest";
import { computeCustomerInsights } from "./customerInsights";

const NOW = new Date(Date.UTC(2026, 6, 28)); // July 28, 2026 (UTC)

const customer = (
  overrides: Partial<{
    createdAt: string;
    numberOfOrders: number;
    amountSpent: number;
    country: string | null;
  }> = {},
) => ({
  createdAt: "2026-07-10T00:00:00Z",
  numberOfOrders: 0,
  amountSpent: 0,
  country: null,
  ...overrides,
});

describe("computeCustomerInsights", () => {
  it("handles an empty sample", () => {
    const insights = computeCustomerInsights([], 0, NOW);
    expect(insights.sampleSize).toBe(0);
    expect(insights.sampled).toBe(false);
    expect(insights.repeatBuyerShare).toBe(0);
    expect(insights.byCountry).toEqual([]);
    expect(insights.byMonth).toHaveLength(6);
    expect(insights.byMonth.at(-1)).toEqual({ label: "Jul", count: 0 });
  });

  it("computes tiles", () => {
    const insights = computeCustomerInsights(
      [
        customer({ numberOfOrders: 3, amountSpent: 100 }),
        customer({ numberOfOrders: 1, amountSpent: 50 }),
        customer({
          numberOfOrders: 0,
          amountSpent: 0,
          createdAt: "2026-05-01T00:00:00Z",
        }),
      ],
      3,
      NOW,
    );
    expect(insights.repeatBuyerShare).toBe(round(1 / 3));
    expect(insights.averageSpend).toBe(50);
    expect(insights.newThisMonth).toBe(2);
    expect(insights.sampled).toBe(false);
  });

  it("flags sampling when the store has more customers than the sample", () => {
    const insights = computeCustomerInsights([customer()], 1000, NOW);
    expect(insights.sampled).toBe(true);
    expect(insights.totalCustomers).toBe(1000);
  });

  it("groups countries with top 5 + Other, counting unknown as Other", () => {
    const customers = [
      ...Array.from({ length: 4 }, () => customer({ country: "United States" })),
      ...Array.from({ length: 3 }, () => customer({ country: "Canada" })),
      customer({ country: "France" }),
      customer({ country: "Germany" }),
      customer({ country: "Japan" }),
      customer({ country: "Brazil" }),
      customer({ country: null }),
    ];
    const insights = computeCustomerInsights(customers, customers.length, NOW);
    expect(insights.byCountry[0]).toMatchObject({
      label: "United States",
      count: 4,
    });
    expect(insights.byCountry).toHaveLength(6);
    const other = insights.byCountry.at(-1)!;
    // Brazil (6th country) + 1 unknown
    expect(other).toMatchObject({ label: "Other", count: 2 });
  });

  it("buckets lifetime spend", () => {
    const insights = computeCustomerInsights(
      [
        customer({ amountSpent: 0 }),
        customer({ amountSpent: 25 }),
        customer({ amountSpent: 50 }),
        customer({ amountSpent: 450 }),
        customer({ amountSpent: 5000 }),
      ],
      5,
      NOW,
    );
    expect(insights.spendBuckets.map((b) => b.count)).toEqual([1, 1, 1, 1, 1]);
  });

  it("counts new customers per month over the last 6 months", () => {
    const insights = computeCustomerInsights(
      [
        customer({ createdAt: "2026-07-01T00:00:00Z" }),
        customer({ createdAt: "2026-06-15T00:00:00Z" }),
        customer({ createdAt: "2026-06-20T00:00:00Z" }),
        customer({ createdAt: "2026-02-01T00:00:00Z" }),
        customer({ createdAt: "2025-12-31T00:00:00Z" }), // outside window
      ],
      5,
      NOW,
    );
    expect(insights.byMonth.map((m) => m.label)).toEqual([
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
    ]);
    expect(insights.byMonth.map((m) => m.count)).toEqual([1, 0, 0, 0, 2, 1]);
  });
});

const round = (n: number) => Math.round(n * 100) / 100;
