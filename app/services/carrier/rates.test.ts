import { describe, expect, it } from "vitest";
import { buildRates, rateName, toCents } from "./rates";

const config = { enabled: true, title: "Non-local delivery", fallbackPrice: null };
const zones = [
  { name: "Downtown", zipCodes: ["33101"], price: 8.5, message: "Same-day before 2pm" },
  { name: "Free zone", zipCodes: ["332*"], price: 0, message: null },
  { name: "Pickup only", zipCodes: ["33300"], price: null, message: null },
];

describe("buildRates", () => {
  it("prices the matching zone in cents, named after the zone, with its message", () => {
    const rates = buildRates({ postalCode: "33101", currency: "USD", config, zones });
    expect(rates).toHaveLength(1);
    expect(rates[0]).toMatchObject({
      service_name: "Downtown",
      service_code: "quali8-delivery",
      total_price: "850",
      currency: "USD",
      description: "Same-day before 2pm",
    });
  });

  it("adds a timed delivery window's surcharge and names it in the rate", () => {
    const timeWindow = { label: "Before 12:00 PM", price: 10 };
    const rates = buildRates({ postalCode: "33101", currency: "USD", config, zones, timeWindow });
    expect(rates[0]).toMatchObject({
      service_name: "Downtown + Timed delivery (Before 12:00 PM)",
      total_price: "1850",
    });
    const free = buildRates({ postalCode: "33250", currency: "USD", config, zones, timeWindow });
    expect(free[0]).toMatchObject({ service_name: "Free zone + Timed delivery (Before 12:00 PM)", total_price: "1000" });
  });

  it("names the rate after the zone even when the window costs nothing", () => {
    expect(rateName("Downtown", { label: "After 3:00 PM", price: 0 })).toBe("Downtown + Timed delivery (After 3:00 PM)");
    expect(rateName("Downtown", null)).toBe("Downtown");
  });

  it("returns a free rate for a zero-priced zone", () => {
    const rates = buildRates({ postalCode: "33250", currency: "USD", config, zones });
    expect(rates[0].total_price).toBe("0");
    expect(rates[0].description).toBeUndefined();
  });

  it("returns nothing for a zone without a price", () => {
    expect(buildRates({ postalCode: "33300", currency: "USD", config, zones })).toEqual([]);
  });

  it("uses the fallback price and the rate title when no zone matches, else nothing", () => {
    expect(buildRates({ postalCode: "90210", currency: "USD", config, zones })).toEqual([]);
    const withFallback = buildRates({
      postalCode: "90210",
      currency: "USD",
      config: { ...config, fallbackPrice: 19.99 },
      zones,
    });
    expect(withFallback[0]).toMatchObject({ service_name: "Non-local delivery", total_price: "1999" });
    const blankTitle = buildRates({
      postalCode: "90210",
      currency: "USD",
      config: { enabled: true, title: "  ", fallbackPrice: 5 },
      zones,
    });
    expect(blankTitle[0].service_name).toBe("Non-local delivery");
  });

  it("returns nothing when disabled or unconfigured", () => {
    expect(buildRates({ postalCode: "33101", currency: "USD", config: null, zones })).toEqual([]);
    expect(
      buildRates({ postalCode: "33101", currency: "USD", config: { ...config, enabled: false }, zones }),
    ).toEqual([]);
  });
});

describe("toCents", () => {
  it("rounds to whole cents", () => {
    expect(toCents(8.5)).toBe("850");
    expect(toCents(0.1 + 0.2)).toBe("30");
  });
});
