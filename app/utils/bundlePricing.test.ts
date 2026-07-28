import { describe, it, expect } from "vitest";
import {
  applyPercentDiscount,
  clampPercent,
  computeBundlePricing,
} from "./bundlePricing";

describe("computeBundlePricing", () => {
  it("sums price * quantity and applies a percentage discount", () => {
    const pricing = computeBundlePricing(
      [
        { price: 20, quantity: 1 },
        { price: 15, quantity: 2 },
      ],
      20,
    );

    expect(pricing).toEqual({
      originalTotal: 50,
      discountPercent: 20,
      discountAmount: 10,
      finalTotal: 40,
      savingsPercent: 20,
    });
  });

  it("avoids float drift on cent-valued prices", () => {
    const pricing = computeBundlePricing(
      [
        { price: 19.99, quantity: 1 },
        { price: 0.1, quantity: 3 },
      ],
      10,
    );

    expect(pricing.originalTotal).toBe(20.29);
    expect(pricing.discountAmount).toBe(2.03);
    expect(pricing.finalTotal).toBe(18.26);
  });

  it("clamps the percent to 100", () => {
    const pricing = computeBundlePricing([{ price: 5, quantity: 1 }], 250);

    expect(pricing.discountPercent).toBe(100);
    expect(pricing.discountAmount).toBe(5);
    expect(pricing.finalTotal).toBe(0);
    expect(pricing.savingsPercent).toBe(100);
  });

  it("treats negative or non-finite percents as zero", () => {
    expect(computeBundlePricing([{ price: 10, quantity: 1 }], -5).finalTotal).toBe(10);
    expect(computeBundlePricing([{ price: 10, quantity: 1 }], NaN).finalTotal).toBe(10);
  });

  it("ignores invalid quantities and handles empty bundles", () => {
    const pricing = computeBundlePricing(
      [
        { price: 10, quantity: 0 },
        { price: 10, quantity: -2 },
        { price: 10, quantity: 1.5 },
      ],
      5,
    );

    expect(pricing.originalTotal).toBe(0);
    expect(pricing.discountAmount).toBe(0);
    expect(pricing.savingsPercent).toBe(0);

    expect(computeBundlePricing([], 10)).toEqual({
      originalTotal: 0,
      discountPercent: 10,
      discountAmount: 0,
      finalTotal: 0,
      savingsPercent: 0,
    });
  });
});

describe("applyPercentDiscount", () => {
  it("discounts a single unit price without float drift", () => {
    expect(applyPercentDiscount(19.99, 10)).toBe(17.99);
    expect(applyPercentDiscount(100, 25)).toBe(75);
  });

  it("clamps percent and handles invalid prices", () => {
    expect(applyPercentDiscount(10, 150)).toBe(0);
    expect(applyPercentDiscount(10, -5)).toBe(10);
    expect(applyPercentDiscount(NaN, 10)).toBe(0);
  });
});

describe("clampPercent", () => {
  it("keeps values inside [0, 100]", () => {
    expect(clampPercent(50)).toBe(50);
    expect(clampPercent(-1)).toBe(0);
    expect(clampPercent(101)).toBe(100);
    expect(clampPercent(Infinity)).toBe(0);
  });
});
