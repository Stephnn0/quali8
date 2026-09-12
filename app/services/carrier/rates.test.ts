import { describe, expect, it } from "vitest";
import { buildRates, toCents } from "./rates";

const config = { enabled: true, title: "Local delivery", fallbackPrice: null };
const zones = [
  { name: "Downtown", zipCodes: ["33101"], price: 8.5, message: "Same-day before 2pm" },
  { name: "Free zone", zipCodes: ["332*"], price: 0, message: null },
  { name: "Pickup only", zipCodes: ["33300"], price: null, message: null },
];

describe("buildRates", () => {
  it("prices the matching zone in cents with its message", () => {
    const rates = buildRates({ postalCode: "33101", currency: "USD", config, zones });
    expect(rates).toHaveLength(1);
    expect(rates[0]).toMatchObject({
      service_name: "Local delivery",
      service_code: "quali8-delivery",
      total_price: "850",
      currency: "USD",
      description: "Same-day before 2pm",
    });
  });

  it("returns a free rate for a zero-priced zone", () => {
    const rates = buildRates({ postalCode: "33250", currency: "USD", config, zones });
    expect(rates[0].total_price).toBe("0");
    expect(rates[0].description).toBeUndefined();
  });

  it("returns nothing for a zone without a price", () => {
    expect(buildRates({ postalCode: "33300", currency: "USD", config, zones })).toEqual([]);
  });

  it("uses the fallback price when no zone matches, else nothing", () => {
    expect(buildRates({ postalCode: "90210", currency: "USD", config, zones })).toEqual([]);
    const withFallback = buildRates({
      postalCode: "90210",
      currency: "USD",
      config: { ...config, fallbackPrice: 19.99 },
      zones,
    });
    expect(withFallback[0].total_price).toBe("1999");
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
