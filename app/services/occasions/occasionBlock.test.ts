import { describe, expect, it } from "vitest";
import { defaultOccasionBlockSettings, sanitizeOccasionBlockSettings, suggestOccasions } from "./occasionBlock";

describe("sanitizeOccasionBlockSettings", () => {
  it("keeps valid input, clamps numbers, and falls back for blank labels", () => {
    const out = sanitizeOccasionBlockSettings({
      heading: "  Celebrating something?  ",
      subheading: "",
      addLabel: "",
      suggestedCount: 99,
      giftLimit: 0,
      afterAdd: "elsewhere" as never,
      pairWithProduct: false,
    });
    expect(out.heading).toBe("Celebrating something?");
    expect(out.subheading).toBe("");
    expect(out.addLabel).toBe("Add both to cart");
    expect(out.suggestedCount).toBe(6);
    expect(out.giftLimit).toBe(2);
    expect(out.afterAdd).toBe("stay");
    expect(out.pairWithProduct).toBe(false);
    expect(sanitizeOccasionBlockSettings(null)).toEqual(defaultOccasionBlockSettings());
  });
});

describe("suggestOccasions", () => {
  it("puts in-season occasions first and caps the list", () => {
    const list = [
      { slug: "a", inSeason: false },
      { slug: "b", inSeason: true },
      { slug: "c", inSeason: false },
      { slug: "d", inSeason: true },
    ];
    expect(suggestOccasions(list, 3).map((o) => o.slug)).toEqual(["b", "d", "a"]);
    expect(suggestOccasions(list, 0)).toEqual([]);
  });
});
