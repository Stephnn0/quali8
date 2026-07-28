import { describe, expect, it } from "vitest";
import { describeCondition } from "./describeCondition";

describe("describeCondition", () => {
  it("describes tags", () => {
    expect(
      describeCondition({
        type: "customer_tag",
        comparisonType: "equals",
        value: "VIP",
      }),
    ).toBe('Tagged "VIP"');
    expect(
      describeCondition({
        type: "tag_not",
        comparisonType: "equals",
        value: "spam",
      }),
    ).toBe('Not tagged "spam"');
  });

  it("describes numeric comparisons", () => {
    expect(
      describeCondition({
        type: "customer_order_count",
        comparisonType: "greater_than",
        value: "3",
      }),
    ).toBe("Order count > 3");
    expect(
      describeCondition({
        type: "customer_amount_spent",
        comparisonType: "greater_than_equals",
        value: "50",
      }),
    ).toBe("Total spent ≥ 50");
  });

  it("describes identity fields", () => {
    expect(
      describeCondition({
        type: "customer_country",
        comparisonType: "equals",
        value: "US",
      }),
    ).toBe("Country is US");
    expect(
      describeCondition({
        type: "customer_email",
        comparisonType: "not_equals",
        value: "a@b.c",
      }),
    ).toBe("Email is not a@b.c");
  });

  it("falls back gracefully for unknown types", () => {
    expect(
      describeCondition({ type: "mystery", comparisonType: "equals", value: "x" }),
    ).toBe("mystery is x");
  });
});
