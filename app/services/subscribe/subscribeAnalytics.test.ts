import { describe, expect, it } from "vitest";
import {
  customerAdminId,
  normalizeEmail,
  normalizeFirstName,
  parseCustomerTags,
  summarizeDailyStats,
} from "./subscribeAnalytics";

describe("normalizeEmail", () => {
  it("lower-cases and trims", () => {
    expect(normalizeEmail("  Ana@Example.COM ")).toBe("ana@example.com");
  });

  it("rejects non-emails and non-strings", () => {
    expect(normalizeEmail("nope")).toBeNull();
    expect(normalizeEmail("a b@example.com")).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
    expect(normalizeEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
  });
});

describe("normalizeFirstName", () => {
  it("collapses whitespace and caps the length", () => {
    expect(normalizeFirstName("  Ana   Maria ")).toBe("Ana Maria");
    expect(normalizeFirstName("x".repeat(100))).toHaveLength(80);
    expect(normalizeFirstName("   ")).toBeNull();
    expect(normalizeFirstName(null)).toBeNull();
  });
});

describe("parseCustomerTags", () => {
  it("always includes the popup tag and dedupes", () => {
    expect(parseCustomerTags("newsletter, quali8-popup ,vip")).toEqual([
      "quali8-popup",
      "newsletter",
      "vip",
    ]);
    expect(parseCustomerTags(undefined)).toEqual(["quali8-popup"]);
  });

  it("drops empty and quoted tags", () => {
    expect(parseCustomerTags(', ,"bad", ok')).toEqual(["quali8-popup", "ok"]);
  });
});

describe("summarizeDailyStats", () => {
  it("zero-fills the window and totals only rows inside it", () => {
    const summary = summarizeDailyStats(
      [
        { day: "2026-09-14", views: 10, dismissals: 4, subscribes: 2 },
        { day: "2026-09-13", views: 30, dismissals: 10, subscribes: 4 },
        { day: "2026-08-01", views: 999, dismissals: 0, subscribes: 999 },
      ],
      "2026-09-14",
      7,
    );
    expect(summary.days).toHaveLength(7);
    expect(summary.days[0].day).toBe("2026-09-08");
    expect(summary.days[6]).toEqual({ day: "2026-09-14", views: 10, dismissals: 4, subscribes: 2 });
    expect(summary.views).toBe(40);
    expect(summary.subscribes).toBe(6);
    expect(summary.dismissals).toBe(14);
    expect(summary.conversionRate).toBe(15);
  });

  it("reports a zero rate with no views", () => {
    expect(summarizeDailyStats([], "2026-09-14", 3).conversionRate).toBe(0);
  });

  it("crosses month boundaries", () => {
    const summary = summarizeDailyStats([], "2026-03-02", 3);
    expect(summary.days.map((d) => d.day)).toEqual(["2026-02-28", "2026-03-01", "2026-03-02"]);
  });
});

describe("customerAdminId", () => {
  it("extracts the numeric id", () => {
    expect(customerAdminId("gid://shopify/Customer/123")).toBe("123");
    expect(customerAdminId("gid://shopify/Product/1")).toBeNull();
    expect(customerAdminId(null)).toBeNull();
  });
});
