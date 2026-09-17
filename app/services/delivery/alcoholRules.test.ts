import { describe, expect, it } from "vitest";
import fixtures from "../../../extensions/alcohol-validation/fixtures/rules.json";
import {
  DEFAULT_AGE_MESSAGE,
  MAX_ALCOHOL_COLLECTIONS,
  defaultAlcoholRules,
  evaluateAlcoholCart,
  fillMessage,
  isIsoDate,
  isOfAge,
  sanitizeAlcoholRules,
  toStorefrontAlcoholRules,
  type StorefrontAlcoholRules,
} from "./alcoholRules";

describe("sanitizeAlcoholRules", () => {
  it("returns defaults for nothing", () => {
    expect(sanitizeAlcoholRules(null)).toEqual(defaultAlcoholRules());
    expect(sanitizeAlcoholRules(undefined)).toEqual(defaultAlcoholRules());
  });

  it("clamps age, trims messages, caps collections, drops bad collections", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `gid://shopify/Collection/${i}`, title: `C${i}` }));
    const out = sanitizeAlcoholRules({
      enabled: true,
      minimumAge: 99,
      ageMessage: "  x ".repeat(100),
      collections: [{ id: "", title: "bad" }, { id: "gid://shopify/Collection/1", title: "dup" }, ...many],
    });
    expect(out.enabled).toBe(true);
    expect(out.minimumAge).toBe(25);
    expect(out.ageMessage.length).toBeLessThanOrEqual(200);
    expect(out.collections).toHaveLength(MAX_ALCOHOL_COLLECTIONS);
    expect(out.collections[0]).toEqual({ id: "gid://shopify/Collection/1", title: "dup" });
    expect(out.collections.every((c) => c.id.startsWith("gid://shopify/Collection/"))).toBe(true);
    expect(sanitizeAlcoholRules({ minimumAge: 3 }).minimumAge).toBe(16);
    expect(sanitizeAlcoholRules({ minimumAge: "18" }).minimumAge).toBe(18);
    expect(sanitizeAlcoholRules({ ageMessage: "   " }).ageMessage).toBe(DEFAULT_AGE_MESSAGE);
  });
});

describe("toStorefrontAlcoholRules", () => {
  it("is disabled without collections even when switched on", () => {
    expect(toStorefrontAlcoholRules({ ...defaultAlcoholRules(), enabled: true }).enabled).toBe(false);
  });

  it("mirrors the rules once a collection is picked", () => {
    const on = toStorefrontAlcoholRules({
      ...defaultAlcoholRules(),
      enabled: true,
      collections: [{ id: "gid://shopify/Collection/1", title: "Wine" }],
    });
    expect(on).toMatchObject({ enabled: true, minimumAge: 21, ageCheck: true, localOnly: true, notAlone: true });
    expect(on.messages.age).toBe(DEFAULT_AGE_MESSAGE);
  });
});

describe("isOfAge", () => {
  it("counts birthdays exactly, including leap days", () => {
    expect(isOfAge("2005-09-16", "2026-09-16", 21)).toBe(true);
    expect(isOfAge("2005-09-17", "2026-09-16", 21)).toBe(false);
    expect(isOfAge("2004-02-29", "2025-02-28", 21)).toBe(false);
    expect(isOfAge("2004-02-29", "2025-03-01", 21)).toBe(true);
    expect(isOfAge("garbage", "2026-09-16", 21)).toBe(false);
    expect(isOfAge("2000-01-01", "garbage", 21)).toBe(false);
  });
});

describe("isIsoDate / fillMessage", () => {
  it("accepts yyyy-mm-dd only, with real calendar dates", () => {
    expect(isIsoDate("1990-01-31")).toBe(true);
    expect(isIsoDate("1990-02-30")).toBe(false);
    expect(isIsoDate("1990-13-01")).toBe(false);
    expect(isIsoDate("31/01/1990")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it("substitutes placeholders and blanks unknown ones", () => {
    expect(fillMessage("A {age} B {zip}", { age: 21 })).toBe("A 21 B ");
    expect(fillMessage("{zip}", { zip: "33101" })).toBe("33101");
  });
});

describe("evaluateAlcoholCart (shared fixtures)", () => {
  const base = fixtures.rules as StorefrontAlcoholRules;

  for (const c of fixtures.cases) {
    it(c.name, () => {
      const rules = { ...base, ...("rules" in c ? c.rules : {}) } as StorefrontAlcoholRules;
      const problems = evaluateAlcoholCart({
        rules,
        alcoholLineCount: c.alcoholLineCount,
        otherLineCount: c.otherLineCount,
        method: c.method as "delivery" | "pickup" | null,
        zipDeliverable: c.zipDeliverable,
        dob: c.dob,
        confirmed: c.confirmed,
      });
      expect(problems.map((p) => p.rule)).toEqual(c.expected);
    });
  }

  it("fills the messages", () => {
    const problems = evaluateAlcoholCart({
      rules: base,
      alcoholLineCount: 1,
      otherLineCount: 0,
      method: "delivery",
      zipDeliverable: false,
      zip: "90210",
      dob: null,
      confirmed: false,
    });
    expect(problems.map((p) => p.message)).toEqual(["Not alone", "Local 90210", "Age 21"]);
  });

  it("also rejects an underage date when today is known", () => {
    const summary = {
      rules: base,
      alcoholLineCount: 1,
      otherLineCount: 1,
      method: "pickup" as const,
      zipDeliverable: null,
      dob: "2010-01-01",
      confirmed: true,
    };
    expect(evaluateAlcoholCart(summary).map((p) => p.rule)).toEqual([]);
    expect(evaluateAlcoholCart({ ...summary, today: "2026-09-16" }).map((p) => p.rule)).toEqual(["age"]);
    expect(evaluateAlcoholCart({ ...summary, dob: "1990-01-01", today: "2026-09-16" })).toEqual([]);
  });
});
