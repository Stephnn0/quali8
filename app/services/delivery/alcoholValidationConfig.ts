import type { AlcoholMessages, AlcoholRules } from "./alcoholRules";

/**
 * The json metafield the validation function reads (`$app.alcohol-rules`).
 * Top-level `collectionIds` doubles as the function's input-query variable.
 * Keep in sync with extensions/alcohol-validation/src/rules.ts (`Config`).
 */
export type AlcoholValidationConfig = {
  collectionIds: string[];
  minimumAge: number;
  ageCheck: boolean;
  localOnly: boolean;
  notAlone: boolean;
  /** Normalised zone entries ("331*" = prefix); empty when localOnly is off */
  zips: string[];
  messages: AlcoholMessages;
};

export function buildAlcoholValidationConfig(
  rules: AlcoholRules,
  zones: Array<{ active: boolean; zipCodes: string[] }>,
): AlcoholValidationConfig {
  const zips = rules.localOnlyEnabled
    ? Array.from(new Set(zones.filter((zone) => zone.active).flatMap((zone) => zone.zipCodes)))
    : [];
  return {
    collectionIds: rules.collections.map((collection) => collection.id),
    minimumAge: rules.minimumAge,
    ageCheck: rules.ageCheckEnabled,
    localOnly: rules.localOnlyEnabled,
    notAlone: rules.notAloneEnabled,
    zips,
    messages: {
      age: rules.ageMessage,
      localOnly: rules.localOnlyMessage,
      notAlone: rules.notAloneMessage,
    },
  };
}
