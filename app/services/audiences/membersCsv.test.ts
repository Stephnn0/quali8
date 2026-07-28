import { describe, expect, it } from "vitest";
import { membersToCsv } from "./membersCsv";

describe("membersToCsv", () => {
  it("renders a header and escapes fields", () => {
    const csv = membersToCsv([
      {
        firstName: 'Ada "The Countess"',
        lastName: "Lovelace",
        email: "ada@example.com",
        country: "United Kingdom",
        amountSpent: "1912.50",
        orderCount: 7,
      },
      {
        firstName: null,
        lastName: null,
        email: null,
        country: null,
        amountSpent: null,
        orderCount: null,
      },
    ]);

    expect(csv.split("\n")).toEqual([
      "first_name,last_name,email,country,total_spent,order_count",
      '"Ada ""The Countess""",Lovelace,ada@example.com,United Kingdom,1912.50,7',
      ",,,,,",
    ]);
  });
});
