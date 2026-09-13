import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  defaultMethodSchedule,
  firstAvailableDate,
  isDateAllowed,
  isIsoDate,
  parseDateList,
  sanitizeMethodSchedule,
  weekdayOf,
} from "./deliverySchedule";

describe("isIsoDate", () => {
  it("accepts real calendar days only", () => {
    expect(isIsoDate("2026-09-13")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("13/09/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("parseDateList", () => {
  it("splits, validates, dedupes and sorts", () => {
    expect(parseDateList("2026-12-25, 2026-01-01\n2026-12-25; nope 2026-11-26")).toEqual([
      "2026-01-01",
      "2026-11-26",
      "2026-12-25",
    ]);
  });
});

describe("date arithmetic", () => {
  it("knows weekdays, adds days and measures distance", () => {
    expect(weekdayOf("2026-09-13")).toBe(0); // Sunday
    expect(weekdayOf("2026-09-14")).toBe(1);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-09-13", "2026-09-20")).toBe(7);
    expect(daysBetween("2026-09-20", "2026-09-13")).toBe(-7);
  });
});

describe("isDateAllowed", () => {
  const today = "2026-09-13"; // a Sunday
  const schedule = { ...defaultMethodSchedule(), blockedWeekdays: [0 as const], blockedDates: ["2026-09-16"], leadDays: 1, maxDaysAhead: 10 };

  it("blocks weekdays, specific dates, and days outside the window", () => {
    expect(isDateAllowed(schedule, "2026-09-13", today)).toBe(false); // today: lead day + Sunday
    expect(isDateAllowed(schedule, "2026-09-14", today)).toBe(true);
    expect(isDateAllowed(schedule, "2026-09-16", today)).toBe(false); // blocked date
    expect(isDateAllowed(schedule, "2026-09-20", today)).toBe(false); // Sunday
    expect(isDateAllowed(schedule, "2026-09-23", today)).toBe(true); // day 10
    expect(isDateAllowed(schedule, "2026-09-24", today)).toBe(false); // day 11
    expect(isDateAllowed(schedule, "2026-09-12", today)).toBe(false); // past
    expect(isDateAllowed(schedule, "garbage", today)).toBe(false);
  });

  it("allows same-day when lead is zero", () => {
    expect(isDateAllowed(defaultMethodSchedule(), today, today)).toBe(true);
  });
});

describe("firstAvailableDate", () => {
  it("skips blocked days and returns null when the window is exhausted", () => {
    const schedule = { ...defaultMethodSchedule(), blockedWeekdays: [0 as const, 1 as const], leadDays: 0, maxDaysAhead: 3 };
    expect(firstAvailableDate(schedule, "2026-09-13")).toBe("2026-09-15"); // Sun, Mon blocked
    const closed = { ...defaultMethodSchedule(), blockedWeekdays: [0, 1, 2, 3, 4, 5, 6] as const as never, maxDaysAhead: 5 };
    expect(firstAvailableDate(closed, "2026-09-13")).toBeNull();
  });
});

describe("sanitizeMethodSchedule", () => {
  it("clamps, dedupes and keeps the window consistent", () => {
    expect(
      sanitizeMethodSchedule({ blockedWeekdays: [6, 6, 9, -1] as never, blockedDates: ["2026-01-01", "bad", "2026-01-01"], leadDays: 99, maxDaysAhead: 2 }),
    ).toEqual({ blockedWeekdays: [6], blockedDates: ["2026-01-01"], leadDays: 60, maxDaysAhead: 60 });
    expect(sanitizeMethodSchedule(null)).toEqual(defaultMethodSchedule());
  });
});
