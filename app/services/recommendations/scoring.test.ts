import { describe, expect, it } from "vitest";
import {
  rankCandidates,
  scoreCandidate,
  type Candidate,
  type RecommendationContext,
} from "./scoring";
import { occasionWindowContains, seasonForDate } from "./constants";

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  productId: "gid://shopify/Product/1",
  variantId: "gid://shopify/ProductVariant/1",
  title: "Red roses",
  price: 60,
  imageUrl: null,
  handle: "red-roses",
  tags: [],
  productType: "Bouquet",
  curatedForOccasion: false,
  ...overrides,
});

const context = (
  overrides: Partial<RecommendationContext> = {},
): RecommendationContext => ({
  occasionSlug: null,
  occasionName: null,
  recipient: null,
  budget: null,
  season: "summer",
  excludeProductIds: [],
  purchasedProductTypes: [],
  purchasedProductIds: [],
  ...overrides,
});

describe("scoreCandidate", () => {
  it("scores curated occasion products highest with an occasion reason", () => {
    const result = scoreCandidate(
      candidate({ curatedForOccasion: true }),
      context({ occasionSlug: "mothers-day", occasionName: "Mother's Day" }),
    );
    expect(result.score).toBe(5);
    expect(result.reason).toBe("Perfect for Mother's Day");
  });

  it("scores occasion tag matches below curated", () => {
    const result = scoreCandidate(
      candidate({ tags: ["q8:occasion:mothers-day"] }),
      context({ occasionSlug: "mothers-day", occasionName: "Mother's Day" }),
    );
    expect(result.score).toBe(4);
  });

  it("stacks recipient, budget, affinity, and season signals", () => {
    const result = scoreCandidate(
      candidate({
        tags: ["q8:recipient:for-mom", "q8:season:summer"],
        price: 60,
        productType: "Bouquet",
      }),
      context({
        recipient: "for-mom",
        budget: "50-100",
        purchasedProductTypes: ["bouquet"],
      }),
    );
    // 3 (recipient) + 3 (budget) + 2 (affinity) + 1 (season)
    expect(result.score).toBe(9);
    expect(result.reason).toBe("Great for mom");
  });

  it("gives no budget points outside the band", () => {
    const result = scoreCandidate(
      candidate({ price: 500 }),
      context({ budget: "under-50" }),
    );
    expect(result.score).toBe(0);
  });
});

describe("rankCandidates", () => {
  it("drops products outside a selected budget band entirely", () => {
    const ranked = rankCandidates(
      [candidate({ productId: "p1", price: 300 })],
      context({ budget: "under-50" }),
    );
    expect(ranked).toHaveLength(0);
  });

  it("excludes cart contents and already-purchased products", () => {
    const ranked = rankCandidates(
      [
        candidate({ productId: "in-cart" }),
        candidate({ productId: "bought" }),
        candidate({ productId: "fresh" }),
      ],
      context({
        excludeProductIds: ["in-cart"],
        purchasedProductIds: ["bought"],
      }),
    );
    expect(ranked.map((product) => product.productId)).toEqual(["fresh"]);
  });

  it("dedupes candidates from multiple sources, keeping the first (curated)", () => {
    const ranked = rankCandidates(
      [
        candidate({ productId: "p1", curatedForOccasion: true }),
        candidate({ productId: "p1", curatedForOccasion: false }),
      ],
      context({ occasionSlug: "birthday", occasionName: "Birthday" }),
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0].score).toBe(5);
  });

  it("ranks by score then price, and respects the limit", () => {
    const ranked = rankCandidates(
      [
        candidate({ productId: "cheap", price: 10 }),
        candidate({ productId: "curated", curatedForOccasion: true, price: 90 }),
        candidate({ productId: "tagged", tags: ["q8:occasion:sympathy"], price: 40 }),
      ],
      context({ occasionSlug: "sympathy", occasionName: "Sympathy" }),
      2,
    );
    expect(ranked.map((product) => product.productId)).toEqual([
      "curated",
      "tagged",
    ]);
  });
});

describe("occasionWindowContains", () => {
  const window = (
    startMonth: number | null,
    startDay: number | null,
    endMonth: number | null,
    endDay: number | null,
  ) => ({ startMonth, startDay, endMonth, endDay });

  it("matches inside a simple window", () => {
    expect(
      occasionWindowContains(window(5, 1, 5, 14), new Date(Date.UTC(2026, 4, 10))),
    ).toBe(true);
    expect(
      occasionWindowContains(window(5, 1, 5, 14), new Date(Date.UTC(2026, 4, 20))),
    ).toBe(false);
  });

  it("handles windows wrapping the year end", () => {
    const christmas = window(12, 20, 1, 5);
    expect(
      occasionWindowContains(christmas, new Date(Date.UTC(2026, 11, 28))),
    ).toBe(true);
    expect(
      occasionWindowContains(christmas, new Date(Date.UTC(2026, 0, 3))),
    ).toBe(true);
    expect(
      occasionWindowContains(christmas, new Date(Date.UTC(2026, 5, 1))),
    ).toBe(false);
  });

  it("never matches a windowless occasion", () => {
    expect(
      occasionWindowContains(window(null, null, null, null), new Date()),
    ).toBe(false);
  });
});

describe("seasonForDate", () => {
  it("maps months to northern-hemisphere seasons", () => {
    expect(seasonForDate(new Date(Date.UTC(2026, 3, 1)))).toBe("spring");
    expect(seasonForDate(new Date(Date.UTC(2026, 6, 1)))).toBe("summer");
    expect(seasonForDate(new Date(Date.UTC(2026, 9, 1)))).toBe("fall");
    expect(seasonForDate(new Date(Date.UTC(2026, 0, 1)))).toBe("winter");
  });
});
