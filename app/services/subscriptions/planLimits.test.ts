import { describe, expect, it } from "vitest";
import {
  applyBundleLimit,
  limitReached,
  monthStartUtc,
  remainingUnderLimit,
} from "./planLimits";

describe("limitReached", () => {
  it("is never reached on an unlimited plan", () => {
    expect(limitReached(null, 50)).toBe(false);
    expect(limitReached(undefined, 50)).toBe(false);
  });

  it("is reached once the amount meets the limit", () => {
    expect(limitReached(1, 0)).toBe(false);
    expect(limitReached(1, 1)).toBe(true);
    expect(limitReached(1, 3)).toBe(true);
  });

  it("treats an unknown amount as zero", () => {
    expect(limitReached(1, null)).toBe(false);
    expect(limitReached(1, undefined)).toBe(false);
    expect(limitReached(0, undefined)).toBe(true);
  });
});

describe("remainingUnderLimit", () => {
  it("is null on an unlimited plan and never negative otherwise", () => {
    expect(remainingUnderLimit(null, 7)).toBeNull();
    expect(remainingUnderLimit(3, 1)).toBe(2);
    expect(remainingUnderLimit(3, 9)).toBe(0);
  });
});

describe("applyBundleLimit", () => {
  const bundles = [{ id: 30 }, { id: 10 }, { id: 20 }];

  it("keeps everything on an unlimited plan", () => {
    expect(applyBundleLimit(bundles, null)).toEqual(bundles);
  });

  it("keeps the oldest bundles (lowest ids) up to the limit, in the input order", () => {
    expect(applyBundleLimit(bundles, 2)).toEqual([{ id: 10 }, { id: 20 }]);
    expect(applyBundleLimit(bundles, 0)).toEqual([]);
  });
});

describe("monthStartUtc", () => {
  it("is midnight UTC on the first of the month", () => {
    expect(monthStartUtc(new Date("2026-09-15T13:45:00Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(monthStartUtc(new Date("2026-12-31T23:59:59Z")).toISOString()).toBe(
      "2026-12-01T00:00:00.000Z",
    );
  });
});
