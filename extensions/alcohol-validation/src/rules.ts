/**
 * Pure alcohol rule evaluation for the function. Mirrors
 * app/services/delivery/alcoholRules.ts (`evaluateAlcoholCart`) and
 * deliveryZones.ts (zip matching); both run ../fixtures/rules.json so the
 * two copies cannot drift silently.
 */

export type Messages = { age: string; localOnly: string; notAlone: string };

/** The `$app.alcohol-rules` metafield (app: buildAlcoholValidationConfig). */
export type Config = {
  collectionIds: string[];
  minimumAge: number;
  ageCheck: boolean;
  localOnly: boolean;
  notAlone: boolean;
  zips: string[];
  messages: Messages;
};

export type Rules = {
  enabled: boolean;
  minimumAge: number;
  ageCheck: boolean;
  localOnly: boolean;
  notAlone: boolean;
  messages: Messages;
};

export type Method = "delivery" | "pickup" | null;

export type Summary = {
  rules: Rules;
  alcoholLineCount: number;
  otherLineCount: number;
  method: Method;
  zipDeliverable: boolean | null;
  zip?: string | null;
  dob: string | null;
  confirmed: boolean;
};

export type RuleId = "age" | "localOnly" | "notAlone";
export type Problem = { rule: RuleId; message: string };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  const m = ISO_DATE.exec(String(value ?? ""));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function fillMessage(template: string, values: Record<string, string | number | null | undefined>): string {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key: string) =>
    values[key] === null || values[key] === undefined ? "" : String(values[key]),
  );
}

export function normalizeZip(input: string | null | undefined): string {
  return String(input ?? "").toUpperCase().replace(/\s+/g, "").slice(0, 12);
}

export function zipMatches(zip: string, entry: string): boolean {
  const code = normalizeZip(zip);
  if (!code) return false;
  if (entry.endsWith("*")) return code.startsWith(entry.slice(0, -1));
  if (code === entry) return true;
  // "33101-1234" (ZIP+4) still matches a plain "33101" entry
  const base = code.split("-")[0];
  return base !== code && base === entry;
}

export function zipInZones(zip: string | null | undefined, zips: string[]): boolean {
  if (!zip) return false;
  return zips.some((entry) => zipMatches(zip, entry));
}

export function configToRules(config: Config): Rules {
  return {
    enabled: config.collectionIds.length > 0,
    minimumAge: config.minimumAge,
    ageCheck: config.ageCheck,
    localOnly: config.localOnly,
    notAlone: config.notAlone,
    messages: config.messages,
  };
}

/** "Pickup" / "Delivery" attribute (any case, surrounding spaces) → method. */
export function chosenMethod(value: string | null | undefined): Method {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pickup") return "pickup";
  if (normalized === "delivery") return "delivery";
  return null;
}

/** Which rules the cart breaks, in the order notAlone → localOnly → age. */
export function evaluate(s: Summary): Problem[] {
  const { rules } = s;
  if (!rules.enabled || s.alcoholLineCount <= 0) return [];
  const problems: Problem[] = [];
  const values = { age: rules.minimumAge, zip: s.zip ?? "" };
  if (rules.notAlone && s.otherLineCount <= 0) {
    problems.push({ rule: "notAlone", message: fillMessage(rules.messages.notAlone, values) });
  }
  if (rules.localOnly && s.method !== "pickup" && s.zipDeliverable !== true) {
    problems.push({ rule: "localOnly", message: fillMessage(rules.messages.localOnly, values).trim() });
  }
  if (rules.ageCheck && (!isIsoDate(s.dob) || !s.confirmed)) {
    problems.push({ rule: "age", message: fillMessage(rules.messages.age, values) });
  }
  return problems;
}
