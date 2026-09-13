import { describe, expect, it } from "vitest";
import {
  findWindow,
  parseWindowCode,
  sanitizeTimeWindows,
  windowCode,
  windowLabel,
} from "./timedDelivery";

const windows = [
  { id: 1, kind: "before" as const, time: "12:00", price: 10, active: true, position: 0 },
  { id: 2, kind: "after" as const, time: "15:00", price: 5, active: true, position: 1 },
  { id: 3, kind: "by" as const, time: "10:00", price: 20, active: false, position: 2 },
];

describe("timed delivery windows", () => {
  it("labels and codes a window", () => {
    expect(windowLabel(windows[0])).toBe("Before 12:00 PM");
    expect(windowLabel(windows[1])).toBe("After 3:00 PM");
    expect(windowLabel(windows[2])).toBe("By 10:00 AM");
    expect(windowCode(windows[1])).toBe("after:15:00");
  });

  it("parses codes strictly", () => {
    expect(parseWindowCode("before:12:00")).toEqual({ kind: "before", time: "12:00" });
    expect(parseWindowCode("soon:12:00")).toBeNull();
    expect(parseWindowCode("before:noon")).toBeNull();
    expect(parseWindowCode(42)).toBeNull();
  });

  it("finds only active windows by code", () => {
    expect(findWindow(windows, "after:15:00")?.id).toBe(2);
    expect(findWindow(windows, "by:10:00")).toBeNull();
    expect(findWindow(windows, "before:13:00")).toBeNull();
  });

  it("sanitises merchant input", () => {
    expect(
      sanitizeTimeWindows([
        { kind: "before", time: "12:00", price: "7.999", active: true },
        { kind: "before", time: "12:00", price: 1 },
        { kind: "after", time: "9:00", price: 1 },
        { kind: "by", time: "18:30", price: -4 },
        "junk",
      ]),
    ).toEqual([
      { kind: "before", time: "12:00", price: 8, active: true },
      { kind: "by", time: "18:30", price: 0, active: true },
    ]);
    expect(sanitizeTimeWindows(null)).toEqual([]);
  });
});
