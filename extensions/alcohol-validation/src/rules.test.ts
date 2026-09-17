import { describe, expect, it } from "vitest";
import fixtures from "../fixtures/rules.json";
import { evaluate, zipInZones, type Method, type Rules } from "./rules";

describe("evaluate (shared fixtures with the app)", () => {
  const base = fixtures.rules as Rules;
  for (const c of fixtures.cases) {
    it(c.name, () => {
      const rules = { ...base, ...("rules" in c ? c.rules : {}) } as Rules;
      const problems = evaluate({
        rules,
        alcoholLineCount: c.alcoholLineCount,
        otherLineCount: c.otherLineCount,
        method: c.method as Method,
        zipDeliverable: c.zipDeliverable,
        dob: c.dob,
        confirmed: c.confirmed,
      });
      expect(problems.map((p) => p.rule)).toEqual(c.expected);
    });
  }
});

describe("zipInZones", () => {
  it("matches exact codes, ZIP+4, and prefixes", () => {
    expect(zipInZones("33101", ["33101"])).toBe(true);
    expect(zipInZones("33101-1234", ["33101"])).toBe(true);
    expect(zipInZones("33199", ["331*"])).toBe(true);
    expect(zipInZones(" sw1a 1aa ", ["SW1A1AA"])).toBe(true);
    expect(zipInZones("40000", ["331*", "33101"])).toBe(false);
    expect(zipInZones(null, ["331*"])).toBe(false);
    expect(zipInZones("33101", [])).toBe(false);
  });
});
