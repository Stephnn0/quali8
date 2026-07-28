import { describe, expect, it } from "vitest";
import {
  coreDatesForYear,
  easterSunday,
  upcomingCoreDates,
} from "./coreDates";

const byName = (dates: Array<{ name: string; date: string }>, name: string) =>
  dates.find((entry) => entry.name === name)?.date;

describe("easterSunday", () => {
  it("matches known Easter dates", () => {
    expect(easterSunday(2024)).toEqual({ month: 3, day: 31 });
    expect(easterSunday(2025)).toEqual({ month: 4, day: 20 });
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 });
  });
});

describe("coreDatesForYear", () => {
  it("computes US movable dates for 2026", () => {
    const dates = coreDatesForYear(2026, "US");
    expect(byName(dates, "Mother's Day")).toBe("2026-05-10"); // 2nd Sunday
    expect(byName(dates, "Father's Day")).toBe("2026-06-21"); // 3rd Sunday
    expect(byName(dates, "Thanksgiving")).toBe("2026-11-26"); // 4th Thursday
    expect(byName(dates, "Black Friday")).toBe("2026-11-27");
    expect(byName(dates, "Cyber Monday")).toBe("2026-11-30");
  });

  it("uses country-specific Mother's Day", () => {
    // UK Mothering Sunday 2026: Easter (Apr 5) minus 21 days
    expect(byName(coreDatesForYear(2026, "GB"), "Mother's Day")).toBe(
      "2026-03-15",
    );
    expect(byName(coreDatesForYear(2026, "MX"), "Mother's Day")).toBe(
      "2026-05-10",
    );
    expect(byName(coreDatesForYear(2026, "FR"), "Mother's Day")).toBe(
      "2026-05-31", // last Sunday of May
    );
  });

  it("only includes Thanksgiving for the US", () => {
    expect(byName(coreDatesForYear(2026, "CA"), "Thanksgiving")).toBeUndefined();
  });
});

describe("upcomingCoreDates", () => {
  it("returns dates within the window, sorted, crossing year ends", () => {
    const upcoming = upcomingCoreDates(new Date(Date.UTC(2026, 11, 1)), "US", 90);
    const names = upcoming.map((entry) => entry.name);
    expect(names).toContain("Christmas");
    expect(names).toContain("Valentine's Day"); // Feb 2027, across the year end
    const dates = upcoming.map((entry) => entry.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("excludes dates outside the window", () => {
    const upcoming = upcomingCoreDates(new Date(Date.UTC(2026, 6, 28)), "US", 30);
    expect(upcoming.map((entry) => entry.name)).not.toContain("Halloween");
  });
});
