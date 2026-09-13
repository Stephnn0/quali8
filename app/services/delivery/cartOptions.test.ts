import { describe, expect, it } from "vitest";
import { defaultCartOptions, sanitizeCartOptions } from "./cartOptions";

describe("sanitizeCartOptions", () => {
  it("keeps booleans, trims and caps the label, falls back when blank", () => {
    expect(sanitizeCartOptions({ enabled: false, notesEnabled: false, notesLabel: "  Delivery instructions  " })).toEqual({
      ...defaultCartOptions(),
      enabled: false,
      notesEnabled: false,
      notesLabel: "Delivery instructions",
    });
    expect(sanitizeCartOptions({ notesLabel: "   " }).notesLabel).toBe("Notes for us");
    expect(sanitizeCartOptions({ notesLabel: "x".repeat(100) }).notesLabel).toHaveLength(60);
    expect(sanitizeCartOptions({ doorEnabled: "yes" as never }).doorEnabled).toBe(true);
    expect(sanitizeCartOptions(null)).toEqual(defaultCartOptions());
  });
});
