import { describe, expect, it } from "vitest";
import { buildCustomerQuery } from "./queryEngine";

const condition = (type: string, comparisonType: string, value: string) => ({
  type,
  comparisonType,
  value,
});

describe("buildCustomerQuery", () => {
  it("maps simple equality", () => {
    expect(buildCustomerQuery([condition("customer_tag", "equals", "VIP")])).toBe(
      "tag:VIP",
    );
  });

  it("applies numeric comparisons", () => {
    expect(
      buildCustomerQuery([
        condition("customer_order_count", "greater_than", "3"),
      ]),
    ).toBe("orders_count:>3");
    expect(
      buildCustomerQuery([
        condition("customer_amount_spent", "less_than_equals", "100"),
      ]),
    ).toBe("total_spent:<=100");
  });

  it("negates not_equals with a minus prefix", () => {
    expect(
      buildCustomerQuery([condition("customer_email", "not_equals", "a@b.c")]),
    ).toBe("-email:a@b.c");
  });

  it("expresses tag_not as a negated tag term", () => {
    expect(buildCustomerQuery([condition("tag_not", "equals", "spam")])).toBe(
      "-tag:spam",
    );
  });

  it("quotes values containing spaces", () => {
    expect(
      buildCustomerQuery([
        condition("customer_country", "equals", "United States"),
      ]),
    ).toBe('country:"United States"');
  });

  it("joins with a space for AND and OR for OR", () => {
    const conditions = [
      condition("customer_tag", "equals", "VIP"),
      condition("customer_order_count", "greater_than", "3"),
    ];
    expect(buildCustomerQuery(conditions, "AND")).toBe(
      "tag:VIP orders_count:>3",
    );
    expect(buildCustomerQuery(conditions, "OR")).toBe(
      "tag:VIP OR orders_count:>3",
    );
  });

  it("skips incomplete conditions and unknown types", () => {
    expect(
      buildCustomerQuery([
        condition("customer_tag", "equals", ""),
        condition("mystery_field", "equals", "x"),
        condition("customer_tag", "equals", "kept"),
      ]),
    ).toBe("tag:kept");
  });

  it("supports date comparisons", () => {
    expect(
      buildCustomerQuery([condition("order_date", "greater_than", "2026-01-01")]),
    ).toBe("order_date:>2026-01-01");
  });
});
