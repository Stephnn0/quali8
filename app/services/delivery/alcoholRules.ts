/**
 * Alcohol compliance rules — pure. Shared by the Delivery page card, the
 * storefront payload, the validation config, and tests. The function in
 * extensions/alcohol-validation re-implements `evaluateAlcoholCart` (it
 * cannot import from app/); both run extensions/alcohol-validation/fixtures/rules.json.
 */

export type AlcoholCollection = { id: string; title: string };

export type AlcoholRules = {
  /** Master switch */
  enabled: boolean;
  /** Collections whose products count as alcohol */
  collections: AlcoholCollection[];
  ageCheckEnabled: boolean;
  minimumAge: number;
  localOnlyEnabled: boolean;
  notAloneEnabled: boolean;
  ageMessage: string;
  localOnlyMessage: string;
  notAloneMessage: string;
};

export const MAX_ALCOHOL_COLLECTIONS = 20;
export const MIN_MINIMUM_AGE = 16;
export const MAX_MINIMUM_AGE = 25;
export const DEFAULT_MINIMUM_AGE = 21;
export const MAX_MESSAGE_LENGTH = 200;
export const DEFAULT_AGE_MESSAGE =
  "You must be {age} or older to purchase alcohol. Please enter your date of birth and confirm.";
export const DEFAULT_LOCAL_ONLY_MESSAGE =
  "Alcohol can only be delivered locally. We can't deliver alcohol to {zip}.";
export const DEFAULT_NOT_ALONE_MESSAGE =
  "Alcohol can't be purchased on its own. Please add another item to your order.";

export const defaultAlcoholRules = (): AlcoholRules => ({
  enabled: false,
  collections: [],
  ageCheckEnabled: true,
  minimumAge: DEFAULT_MINIMUM_AGE,
  localOnlyEnabled: true,
  notAloneEnabled: true,
  ageMessage: DEFAULT_AGE_MESSAGE,
  localOnlyMessage: DEFAULT_LOCAL_ONLY_MESSAGE,
  notAloneMessage: DEFAULT_NOT_ALONE_MESSAGE,
});

const COLLECTION_GID = /^gid:\/\/shopify\/Collection\/\d+$/;

function sanitizeCollections(input: unknown): AlcoholCollection[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: AlcoholCollection[] = [];
  for (const raw of input) {
    const id = String((raw as { id?: unknown })?.id ?? "").trim();
    if (!COLLECTION_GID.test(id) || seen.has(id)) continue;
    seen.add(id);
    const title = String((raw as { title?: unknown })?.title ?? "").trim().slice(0, 120);
    out.push({ id, title: title || "Collection" });
    if (out.length >= MAX_ALCOHOL_COLLECTIONS) break;
  }
  return out;
}

function message(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  return text || fallback;
}

/** Clamp untrusted input (DB row, form body) into AlcoholRules. */
export function sanitizeAlcoholRules(
  input: Partial<Record<keyof AlcoholRules, unknown>> | null | undefined,
): AlcoholRules {
  const base = defaultAlcoholRules();
  if (!input) return base;
  const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
  const age = Number(input.minimumAge);
  return {
    enabled: flag(input.enabled, base.enabled),
    collections: sanitizeCollections(input.collections),
    ageCheckEnabled: flag(input.ageCheckEnabled, base.ageCheckEnabled),
    minimumAge:
      input.minimumAge !== undefined && input.minimumAge !== null && Number.isFinite(age)
        ? Math.min(MAX_MINIMUM_AGE, Math.max(MIN_MINIMUM_AGE, Math.round(age)))
        : base.minimumAge,
    localOnlyEnabled: flag(input.localOnlyEnabled, base.localOnlyEnabled),
    notAloneEnabled: flag(input.notAloneEnabled, base.notAloneEnabled),
    ageMessage: message(input.ageMessage, base.ageMessage),
    localOnlyMessage: message(input.localOnlyMessage, base.localOnlyMessage),
    notAloneMessage: message(input.notAloneMessage, base.notAloneMessage),
  };
}

// --- Storefront / function view ------------------------------------------------

export type AlcoholMessages = { age: string; localOnly: string; notAlone: string };

export type StorefrontAlcoholRules = {
  /** False when the switch is off or no collection is configured */
  enabled: boolean;
  minimumAge: number;
  ageCheck: boolean;
  localOnly: boolean;
  notAlone: boolean;
  messages: AlcoholMessages;
};

export function toStorefrontAlcoholRules(rules: AlcoholRules): StorefrontAlcoholRules {
  return {
    enabled: rules.enabled && rules.collections.length > 0,
    minimumAge: rules.minimumAge,
    ageCheck: rules.ageCheckEnabled,
    localOnly: rules.localOnlyEnabled,
    notAlone: rules.notAloneEnabled,
    messages: {
      age: rules.ageMessage,
      localOnly: rules.localOnlyMessage,
      notAlone: rules.notAloneMessage,
    },
  };
}

export const disabledStorefrontAlcoholRules = (): StorefrontAlcoholRules =>
  toStorefrontAlcoholRules(defaultAlcoholRules());

// --- Dates -------------------------------------------------------------------

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written yyyy-mm-dd. */
export function isIsoDate(value: unknown): value is string {
  const m = ISO_DATE.exec(String(value ?? ""));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** True when someone born on `dob` is at least `minimumAge` on `today` (both yyyy-mm-dd). */
export function isOfAge(dob: string, today: string, minimumAge: number): boolean {
  if (!isIsoDate(dob) || !isIsoDate(today)) return false;
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= minimumAge;
}

/** Replaces `{key}` placeholders; unknown keys become empty. */
export function fillMessage(
  template: string,
  values: Record<string, string | number | null | undefined>,
): string {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key: string) =>
    values[key] === null || values[key] === undefined ? "" : String(values[key]),
  );
}

// --- Evaluation --------------------------------------------------------------

export type AlcoholRuleId = "age" | "localOnly" | "notAlone";
export type AlcoholProblem = { rule: AlcoholRuleId; message: string };

export type AlcoholCartSummary = {
  rules: StorefrontAlcoholRules;
  alcoholLineCount: number;
  otherLineCount: number;
  /** null = not chosen yet; treated as delivery (the strict case) */
  method: "delivery" | "pickup" | null;
  /** null = not checked / unknown (treated as not deliverable) */
  zipDeliverable: boolean | null;
  zip?: string | null;
  dob: string | null;
  confirmed: boolean;
  /** yyyy-mm-dd; when given the date of birth is also checked against the minimum age */
  today?: string | null;
};

/** Which rules the cart breaks, in the order notAlone → localOnly → age. */
export function evaluateAlcoholCart(s: AlcoholCartSummary): AlcoholProblem[] {
  const { rules } = s;
  if (!rules.enabled || s.alcoholLineCount <= 0) return [];
  const problems: AlcoholProblem[] = [];
  const values = { age: rules.minimumAge, zip: s.zip ?? "" };
  if (rules.notAlone && s.otherLineCount <= 0) {
    problems.push({ rule: "notAlone", message: fillMessage(rules.messages.notAlone, values) });
  }
  if (rules.localOnly && s.method !== "pickup" && s.zipDeliverable !== true) {
    problems.push({ rule: "localOnly", message: fillMessage(rules.messages.localOnly, values).trim() });
  }
  if (rules.ageCheck) {
    const dobOk = isIsoDate(s.dob) && (!s.today || isOfAge(s.dob, s.today, rules.minimumAge));
    if (!dobOk || !s.confirmed) {
      problems.push({ rule: "age", message: fillMessage(rules.messages.age, values) });
    }
  }
  return problems;
}
