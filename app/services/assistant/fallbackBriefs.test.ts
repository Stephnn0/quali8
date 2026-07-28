import { describe, expect, it } from "vitest";
import { assistantBriefSchema } from "./briefSchema";
import { buildFallbackBrief } from "./fallbackBriefs";
import { classifyByKeywords } from "./taxonomy";

const NOW = new Date(Date.UTC(2026, 3, 1)); // April 1, 2026

describe("buildFallbackBrief", () => {
  it("produces a schema-valid brief for florists", () => {
    const brief = buildFallbackBrief("flowers-gifting", "US", NOW);
    expect(assistantBriefSchema.safeParse(brief).success).toBe(true);
    const names = brief.occasions.map((occasion) => occasion.name);
    expect(names).toContain("Mother's Day");
    expect(
      brief.occasions.find((occasion) => occasion.name === "Mother's Day")?.date,
    ).toBe("2026-05-10");
  });

  it("respects country-specific dates", () => {
    const brief = buildFallbackBrief("flowers-gifting", "GB", new Date(Date.UTC(2026, 1, 20)));
    expect(
      brief.occasions.find((occasion) => occasion.name === "Mother's Day")?.date,
    ).toBe("2026-03-15"); // Mothering Sunday
  });

  it("produces a generic brief for other niches", () => {
    const brief = buildFallbackBrief("pets", "CA", NOW);
    expect(assistantBriefSchema.safeParse(brief).success).toBe(true);
    expect(brief.insight.toLowerCase()).toContain("pets");
    expect(brief.checklist.length).toBeGreaterThanOrEqual(5);
  });
});

describe("classifyByKeywords", () => {
  it("classifies obvious catalogs", () => {
    expect(classifyByKeywords("Red Rose Bouquet | Florist Choice")).toBe(
      "flowers-gifting",
    );
    expect(classifyByKeywords("Espresso Blend | Whole Bean Coffee")).toBe(
      "coffee-tea",
    );
    expect(classifyByKeywords("Dog leash | Puppy chew toy")).toBe("pets");
  });

  it("falls back to other", () => {
    expect(classifyByKeywords("Widget Deluxe 3000")).toBe("other");
  });
});
