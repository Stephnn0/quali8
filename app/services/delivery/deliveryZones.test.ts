import { describe, expect, it } from "vitest";
import {
  matchZone,
  normalizeZip,
  parseZipList,
  zipMatches,
} from "./deliveryZones";

describe("normalizeZip", () => {
  it("uppercases, strips whitespace, and caps the length", () => {
    expect(normalizeZip(" sw1a 1aa ")).toBe("SW1A1AA");
    expect(normalizeZip("1234567890123456")).toHaveLength(12);
  });
});

describe("parseZipList", () => {
  it("splits on commas, newlines, semicolons, and spaces, dedupes, keeps prefixes", () => {
    expect(parseZipList("33101, 33102\n33103;33101 331*")).toEqual([
      "33101",
      "33102",
      "33103",
      "331*",
    ]);
  });

  it("drops junk", () => {
    expect(parseZipList("*, ???, 90210")).toEqual(["90210"]);
  });
});

describe("zipMatches", () => {
  it("matches exact codes regardless of case and spacing", () => {
    expect(zipMatches("sw1a 1aa", "SW1A1AA")).toBe(true);
  });

  it("matches prefixes", () => {
    expect(zipMatches("33199", "331*")).toBe(true);
    expect(zipMatches("33299", "331*")).toBe(false);
  });

  it("matches ZIP+4 against the five-digit entry", () => {
    expect(zipMatches("33101-1234", "33101")).toBe(true);
    expect(zipMatches("33101-1234", "33102")).toBe(false);
  });
});

describe("matchZone", () => {
  const zones = [
    { name: "Downtown", zipCodes: ["33101", "33102"] },
    { name: "Greater Miami", zipCodes: ["331*"] },
  ];

  it("returns the first zone in order", () => {
    expect(matchZone(zones, "33101")?.name).toBe("Downtown");
    expect(matchZone(zones, "33150")?.name).toBe("Greater Miami");
  });

  it("returns null when nothing matches", () => {
    expect(matchZone(zones, "90210")).toBeNull();
  });
});
