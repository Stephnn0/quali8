import { describe, expect, it } from "vitest";
import { defaultAlcoholRules } from "./alcoholRules";
import { buildAlcoholValidationConfig } from "./alcoholValidationConfig";

describe("buildAlcoholValidationConfig", () => {
  it("flattens active zones' zips and mirrors the rules", () => {
    const rules = {
      ...defaultAlcoholRules(),
      enabled: true,
      collections: [{ id: "gid://shopify/Collection/1", title: "Wine" }],
    };
    const config = buildAlcoholValidationConfig(rules, [
      { active: true, zipCodes: ["33101", "331*"] },
      { active: false, zipCodes: ["99999"] },
      { active: true, zipCodes: ["33101", "33102"] },
    ]);
    expect(config.collectionIds).toEqual(["gid://shopify/Collection/1"]);
    expect(config.zips).toEqual(["33101", "331*", "33102"]);
    expect(config).toMatchObject({ minimumAge: 21, ageCheck: true, localOnly: true, notAlone: true });
    expect(config.messages.notAlone).toBe(rules.notAloneMessage);
  });

  it("sends no zips when local-only is off", () => {
    const rules = { ...defaultAlcoholRules(), localOnlyEnabled: false };
    expect(buildAlcoholValidationConfig(rules, [{ active: true, zipCodes: ["1"] }]).zips).toEqual([]);
  });
});
