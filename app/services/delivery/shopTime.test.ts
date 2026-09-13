import { describe, expect, it } from "vitest";
import { formatTime12, isValidTime, isValidTimezone, minutesOf, shopNow } from "./shopTime";

describe("shopNow", () => {
  const at = new Date("2026-09-13T05:17:43.613Z");

  it("reads the date and time in the shop's zone", () => {
    expect(shopNow("America/New_York", at)).toEqual({ timezone: "America/New_York", date: "2026-09-13", time: "01:17" });
    expect(shopNow("Asia/Tokyo", at)).toEqual({ timezone: "Asia/Tokyo", date: "2026-09-13", time: "14:17" });
    expect(shopNow("Pacific/Auckland", at)).toEqual({ timezone: "Pacific/Auckland", date: "2026-09-13", time: "17:17" });
  });

  it("rolls the date across midnight", () => {
    expect(shopNow("America/Los_Angeles", at)).toEqual({ timezone: "America/Los_Angeles", date: "2026-09-12", time: "22:17" });
  });

  it("falls back to UTC for an unknown zone and never says 24:xx", () => {
    expect(shopNow("Mars/Olympus", at)).toEqual({ timezone: "UTC", date: "2026-09-13", time: "05:17" });
    expect(shopNow(null, new Date("2026-09-13T00:05:00Z")).time).toBe("00:05");
  });
});

describe("time helpers", () => {
  it("validates HH:MM", () => {
    expect(isValidTime("14:00")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:00")).toBe(false);
    expect(isValidTime(null)).toBe(false);
  });

  it("formats 12-hour labels", () => {
    expect(formatTime12("00:00")).toBe("12:00 AM");
    expect(formatTime12("09:05")).toBe("9:05 AM");
    expect(formatTime12("12:00")).toBe("12:00 PM");
    expect(formatTime12("14:30")).toBe("2:30 PM");
    expect(formatTime12("nope")).toBe("nope");
  });

  it("orders by minutes", () => {
    expect(minutesOf("14:30")).toBe(870);
    expect(minutesOf("bad")).toBe(-1);
  });

  it("recognises IANA zones", () => {
    expect(isValidTimezone("Europe/Madrid")).toBe(true);
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone("Nowhere/Land")).toBe(false);
  });
});
