# Alcohol Compliance Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merchants toggle three alcohol rules (age check, local delivery only, not sold alone) on the Delivery page; the cart widget guides shoppers and a Cart & Checkout Validation function blocks checkout server-side.

**Architecture:** One `AlcoholRules` row per shop feeds (a) the Delivery page card, (b) the storefront via `proxy.delivery-schedule` + a new `proxy.alcohol-check`, and (c) a Shopify validation whose `$app.alcohol-rules` json metafield the new `extensions/alcohol-validation` function reads. Pure rule logic lives in `app/services/delivery/alcoholRules.ts`, re-implemented in the function, both run one shared fixture file.

**Tech Stack:** React Router 7 + Polaris (admin), Prisma/Postgres, Shopify Admin GraphQL 2026-04 (`validationCreate`/`validationUpdate`, `Product.inCollection`), Shopify Functions `cart.validations.generate.run` (TypeScript, api 2026-04), theme app block JS.

Spec: `docs/superpowers/specs/2026-09-16-alcohol-compliance-design.md`.

**Verified facts (do not re-derive):**
- `ValidationCreateInput` fields: `functionHandle`, `title`, `enable`, `blockOnFailure`, `metafields: [MetafieldInput!]` (`functionId` is deprecated). `ValidationUpdateInput`: `title`, `enable`, `blockOnFailure`, `metafields`.
- `validations(first)` nodes expose `id title enabled blockOnFailure shopifyFunction { id title apiType app { handle } }`.
- `shopifyFunctions(first, apiType: "cart_checkout_validation")`.
- Admin `Product.inCollection(id: ID!): Boolean!`.
- Function `Input` has `buyerJourney { step }` (`CART_INTERACTION | CHECKOUT_INTERACTION | CHECKOUT_COMPLETION`), `validation { metafield(namespace, key) { jsonValue } }`, `cart { attribute(key) { value }, lines { merchandise { __typename ... on ProductVariant { product { inAnyCollection(ids: [ID!]!) } } } }, deliveryGroups { deliveryAddress { zip } selectedDeliveryOption { deliveryMethodType } } }`; `DeliveryMethod` includes `PICK_UP`, `SHIPPING`, `LOCAL`.
- Output: `{ operations: [{ validationAdd: { errors: [{ message, target }] } }] }`; zip target is `$.cart.deliveryGroups[0].deliveryAddress.zip`, cart target `$.cart`.
- Input variables come from the owner's metafield via `[extensions.input.variables] namespace="$app" key="alcohol-rules"`; each top-level JSON key = variable name.
- The extension scaffold already exists at `extensions/alcohol-validation` (pinned to 2026-04, schema refreshed). `shopify.app.toml` must never be edited; `write_validations` is a manual step for the developer.
- Root tests: `npx vitest run` (config `vitest.config.ts`, `app/**/*.test.ts`). Extension tests: `npx vitest run` inside the extension dir.
- Stage files explicitly; never `git add -A` (many unrelated working-tree changes exist).

---

### Task 1: Prisma model `AlcoholRules`

**Files:**
- Modify: `prisma/schema.prisma` (ShopifyStore relations block near line 59; new model after `CartOptionsSettings`)
- Create: `prisma/migrations/<timestamp>_alcohol_rules/migration.sql`

- [ ] **Step 1: Add the relation and model**

In `model ShopifyStore`, after `cartOptions         CartOptionsSettings?` add:
```prisma
  alcoholRules        AlcoholRules?
```
After `model CartOptionsSettings { … }` add:
```prisma
/// Alcohol compliance rules for the cart block and the checkout validation
/// function (extensions/alcohol-validation). One per shop; managed on the
/// Delivery page. `collections` = [{ id, title }] of the alcohol collections.
model AlcoholRules {
  id               Int          @id @default(autoincrement())
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @default(now()) @updatedAt
  //
  enabled          Boolean      @default(false) /// Master switch
  collections      Json         @default("[]")
  ageCheckEnabled  Boolean      @default(true)
  minimumAge       Int          @default(21)
  localOnlyEnabled Boolean      @default(true)
  notAloneEnabled  Boolean      @default(true)
  ageMessage       String       @default("You must be {age} or older to purchase alcohol. Please enter your date of birth and confirm.")
  localOnlyMessage String       @default("Alcohol can only be delivered locally. We can't deliver alcohol to {zip}.")
  notAloneMessage  String       @default("Alcohol can't be purchased on its own. Please add another item to your order.")
  /// GID of the Shopify validation once created
  validationId     String?
  //
  shop             String       @unique
  shopifyStore     ShopifyStore @relation(fields: [shop], references: [shop], onDelete: Cascade, onUpdate: Cascade)
}
```

- [ ] **Step 2: Create the migration**

Run: `npx prisma migrate dev --name alcohol_rules` (local DB at `DATABASE_URL`). If the DB is unreachable, write `prisma/migrations/20260917000000_alcohol_rules/migration.sql` by hand:
```sql
-- CreateTable
CREATE TABLE "AlcoholRules" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "collections" JSONB NOT NULL DEFAULT '[]',
    "ageCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minimumAge" INTEGER NOT NULL DEFAULT 21,
    "localOnlyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notAloneEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ageMessage" TEXT NOT NULL DEFAULT 'You must be {age} or older to purchase alcohol. Please enter your date of birth and confirm.',
    "localOnlyMessage" TEXT NOT NULL DEFAULT 'Alcohol can only be delivered locally. We can''t deliver alcohol to {zip}.',
    "notAloneMessage" TEXT NOT NULL DEFAULT 'Alcohol can''t be purchased on its own. Please add another item to your order.',
    "validationId" TEXT,
    "shop" TEXT NOT NULL,

    CONSTRAINT "AlcoholRules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlcoholRules_shop_key" ON "AlcoholRules"("shop");

-- AddForeignKey
ALTER TABLE "AlcoholRules" ADD CONSTRAINT "AlcoholRules_shop_fkey" FOREIGN KEY ("shop") REFERENCES "ShopifyStore"("shop") ON DELETE CASCADE ON UPDATE CASCADE;
```
then `npx prisma generate`.

- [ ] **Step 3: Verify** `npx prisma validate` → "The schema is valid".

- [ ] **Step 4: Commit** `git add prisma/schema.prisma prisma/migrations/*_alcohol_rules && git commit -m "Alcohol rules: AlcoholRules model"`

---

### Task 2: Pure rules module `alcoholRules.ts` (TDD)

**Files:**
- Create: `app/services/delivery/alcoholRules.ts`
- Create: `app/services/delivery/alcoholRules.test.ts`
- Create: `extensions/alcohol-validation/fixtures/rules.json` (shared fixtures)

- [ ] **Step 1: Write the shared fixture file**

`extensions/alcohol-validation/fixtures/rules.json` — each case is an `AlcoholCartSummary` minus `rules` (rules given per case as overrides) and the expected rule ids:
```json
{
  "rules": { "enabled": true, "minimumAge": 21, "ageCheck": true, "localOnly": true, "notAlone": true,
             "messages": { "age": "Age {age}", "localOnly": "Local {zip}", "notAlone": "Not alone" } },
  "cases": [
    { "name": "no alcohol: nothing fires", "alcoholLineCount": 0, "otherLineCount": 0, "method": "delivery", "zipDeliverable": false, "dob": null, "confirmed": false, "expected": [] },
    { "name": "alcohol alone", "alcoholLineCount": 1, "otherLineCount": 0, "method": "pickup", "zipDeliverable": null, "dob": "1990-01-01", "confirmed": true, "expected": ["notAlone"] },
    { "name": "delivery outside zones", "alcoholLineCount": 1, "otherLineCount": 1, "method": "delivery", "zipDeliverable": false, "dob": "1990-01-01", "confirmed": true, "expected": ["localOnly"] },
    { "name": "delivery with unknown zip", "alcoholLineCount": 1, "otherLineCount": 1, "method": "delivery", "zipDeliverable": null, "dob": "1990-01-01", "confirmed": true, "expected": ["localOnly"] },
    { "name": "pickup ignores zones", "alcoholLineCount": 1, "otherLineCount": 1, "method": "pickup", "zipDeliverable": false, "dob": "1990-01-01", "confirmed": true, "expected": [] },
    { "name": "missing dob", "alcoholLineCount": 1, "otherLineCount": 1, "method": "pickup", "zipDeliverable": null, "dob": null, "confirmed": true, "expected": ["age"] },
    { "name": "malformed dob", "alcoholLineCount": 1, "otherLineCount": 1, "method": "pickup", "zipDeliverable": null, "dob": "01/01/1990", "confirmed": true, "expected": ["age"] },
    { "name": "not confirmed", "alcoholLineCount": 1, "otherLineCount": 1, "method": "pickup", "zipDeliverable": null, "dob": "1990-01-01", "confirmed": false, "expected": ["age"] },
    { "name": "everything wrong", "alcoholLineCount": 2, "otherLineCount": 0, "method": "delivery", "zipDeliverable": false, "dob": null, "confirmed": false, "expected": ["notAlone", "localOnly", "age"] },
    { "name": "rules disabled", "rules": { "enabled": false }, "alcoholLineCount": 2, "otherLineCount": 0, "method": "delivery", "zipDeliverable": false, "dob": null, "confirmed": false, "expected": [] },
    { "name": "only age rule on", "rules": { "localOnly": false, "notAlone": false }, "alcoholLineCount": 1, "otherLineCount": 0, "method": "delivery", "zipDeliverable": false, "dob": null, "confirmed": false, "expected": ["age"] }
  ]
}
```

- [ ] **Step 2: Write the failing tests** (`app/services/delivery/alcoholRules.test.ts`)

```ts
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
  });
  it("clamps age, trims messages, caps collections, drops bad collections", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `gid://shopify/Collection/${i}`, title: `C${i}` }));
    const out = sanitizeAlcoholRules({
      enabled: true,
      minimumAge: 99,
      ageMessage: "  x ".repeat(100),
      collections: [...many, { id: "", title: "bad" }, { id: "gid://shopify/Collection/1", title: "dup" }] as never,
    });
    expect(out.minimumAge).toBe(25);
    expect(out.ageMessage.length).toBeLessThanOrEqual(200);
    expect(out.collections).toHaveLength(MAX_ALCOHOL_COLLECTIONS);
    expect(out.collections.every((c) => c.id.startsWith("gid://shopify/Collection/"))).toBe(true);
    expect(sanitizeAlcoholRules({ minimumAge: 3 }).minimumAge).toBe(16);
    expect(sanitizeAlcoholRules({ ageMessage: "   " }).ageMessage).toBe(DEFAULT_AGE_MESSAGE);
  });
});

describe("toStorefrontAlcoholRules", () => {
  it("is disabled without collections even when switched on", () => {
    expect(toStorefrontAlcoholRules({ ...defaultAlcoholRules(), enabled: true }).enabled).toBe(false);
    const on = toStorefrontAlcoholRules({ ...defaultAlcoholRules(), enabled: true, collections: [{ id: "gid://shopify/Collection/1", title: "Wine" }] });
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
  });
});

describe("isIsoDate / fillMessage", () => {
  it("accepts yyyy-mm-dd only", () => {
    expect(isIsoDate("1990-01-31")).toBe(true);
    expect(isIsoDate("1990-13-01")).toBe(false);
    expect(isIsoDate("31/01/1990")).toBe(false);
  });
  it("substitutes placeholders and drops unknown ones", () => {
    expect(fillMessage("A {age} B {zip}", { age: 21 })).toBe("A 21 B ");
  });
});

describe("evaluateAlcoholCart (shared fixtures)", () => {
  const base = fixtures.rules as StorefrontAlcoholRules;
  for (const c of fixtures.cases) {
    it(c.name, () => {
      const rules = { ...base, ...(c.rules ?? {}) } as StorefrontAlcoholRules;
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
  it("also rejects an underage date when today is known", () => {
    const rules = { ...base } as StorefrontAlcoholRules;
    const summary = { rules, alcoholLineCount: 1, otherLineCount: 1, method: "pickup" as const, zipDeliverable: null, dob: "2010-01-01", confirmed: true };
    expect(evaluateAlcoholCart(summary).map((p) => p.rule)).toEqual([]);
    expect(evaluateAlcoholCart({ ...summary, today: "2026-09-16" }).map((p) => p.rule)).toEqual(["age"]);
    expect(evaluateAlcoholCart({ ...summary, today: "2026-09-16" })[0].message).toBe("Age 21");
  });
});
```

- [ ] **Step 3: Run** `npx vitest run app/services/delivery/alcoholRules.test.ts` → FAIL (module missing). Add `"resolveJsonModule": true` to `tsconfig.json` compilerOptions if JSON import errors (check first: `grep resolveJsonModule tsconfig.json`).

- [ ] **Step 4: Implement** `app/services/delivery/alcoholRules.ts`

```ts
/**
 * Alcohol compliance rules — pure. Shared by the Delivery page card, the
 * storefront payload, the validation config, and tests. The function in
 * extensions/alcohol-validation re-implements `evaluateAlcoholCart` and both
 * run extensions/alcohol-validation/fixtures/rules.json.
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
export const DEFAULT_AGE_MESSAGE = "You must be {age} or older to purchase alcohol. Please enter your date of birth and confirm.";
export const DEFAULT_LOCAL_ONLY_MESSAGE = "Alcohol can only be delivered locally. We can't deliver alcohol to {zip}.";
export const DEFAULT_NOT_ALONE_MESSAGE = "Alcohol can't be purchased on its own. Please add another item to your order.";

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
    out.push({ id, title: String((raw as { title?: unknown })?.title ?? "").trim().slice(0, 120) || "Collection" });
    if (out.length >= MAX_ALCOHOL_COLLECTIONS) break;
  }
  return out;
}

function message(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  return text || fallback;
}

/** Clamp untrusted input (DB row, form body) into AlcoholRules. */
export function sanitizeAlcoholRules(input: Partial<Record<keyof AlcoholRules, unknown>> | null | undefined): AlcoholRules {
  const base = defaultAlcoholRules();
  if (!input) return base;
  const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
  const age = Number(input.minimumAge);
  return {
    enabled: flag(input.enabled, base.enabled),
    collections: sanitizeCollections(input.collections),
    ageCheckEnabled: flag(input.ageCheckEnabled, base.ageCheckEnabled),
    minimumAge: Number.isFinite(age) ? Math.min(MAX_MINIMUM_AGE, Math.max(MIN_MINIMUM_AGE, Math.round(age))) : base.minimumAge,
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

export const disabledStorefrontAlcoholRules = (): StorefrontAlcoholRules => toStorefrontAlcoholRules(defaultAlcoholRules());

export function toStorefrontAlcoholRules(rules: AlcoholRules): StorefrontAlcoholRules {
  return {
    enabled: rules.enabled && rules.collections.length > 0,
    minimumAge: rules.minimumAge,
    ageCheck: rules.ageCheckEnabled,
    localOnly: rules.localOnlyEnabled,
    notAlone: rules.notAloneEnabled,
    messages: { age: rules.ageMessage, localOnly: rules.localOnlyMessage, notAlone: rules.notAloneMessage },
  };
}

// --- Dates -------------------------------------------------------------------

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

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
export function fillMessage(template: string, values: Record<string, string | number | null | undefined>): string {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key: string) => (values[key] === null || values[key] === undefined ? "" : String(values[key])));
}

// --- Evaluation --------------------------------------------------------------

export type AlcoholRuleId = "age" | "localOnly" | "notAlone";
export type AlcoholProblem = { rule: AlcoholRuleId; message: string };

export type AlcoholCartSummary = {
  rules: StorefrontAlcoholRules;
  alcoholLineCount: number;
  otherLineCount: number;
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
    if (!dobOk || !s.confirmed) problems.push({ rule: "age", message: fillMessage(rules.messages.age, values) });
  }
  return problems;
}
```

- [ ] **Step 5: Run** the test → PASS. Run `npx vitest run` → everything green.

- [ ] **Step 6: Commit** `git add app/services/delivery/alcoholRules.ts app/services/delivery/alcoholRules.test.ts extensions/alcohol-validation/fixtures/rules.json tsconfig.json && git commit -m "Alcohol rules: pure rule evaluation with shared fixtures"`

---

### Task 3: Validation config builder (TDD)

**Files:**
- Create: `app/services/delivery/alcoholValidationConfig.ts`
- Create: `app/services/delivery/alcoholValidationConfig.test.ts`

- [ ] **Step 1: Test**
```ts
import { describe, expect, it } from "vitest";
import { defaultAlcoholRules } from "./alcoholRules";
import { buildAlcoholValidationConfig } from "./alcoholValidationConfig";

describe("buildAlcoholValidationConfig", () => {
  it("flattens active zones' zips and mirrors the rules", () => {
    const rules = { ...defaultAlcoholRules(), enabled: true, collections: [{ id: "gid://shopify/Collection/1", title: "Wine" }] };
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
```
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**
```ts
import type { AlcoholMessages, AlcoholRules } from "./alcoholRules";

/**
 * The json metafield the validation function reads (`$app.alcohol-rules`).
 * Top-level `collectionIds` doubles as the function's input-query variable.
 * Keep in sync with extensions/alcohol-validation/src/rules.ts (Config).
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
    ? Array.from(new Set(zones.filter((z) => z.active).flatMap((z) => z.zipCodes)))
    : [];
  return {
    collectionIds: rules.collections.map((c) => c.id),
    minimumAge: rules.minimumAge,
    ageCheck: rules.ageCheckEnabled,
    localOnly: rules.localOnlyEnabled,
    notAlone: rules.notAloneEnabled,
    zips,
    messages: { age: rules.ageMessage, localOnly: rules.localOnlyMessage, notAlone: rules.notAloneMessage },
  };
}
```
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `git add app/services/delivery/alcoholValidationConfig.ts app/services/delivery/alcoholValidationConfig.test.ts && git commit -m "Alcohol rules: validation config builder"`

---

### Task 4: Rules persistence `alcoholRules.server.ts`

**Files:**
- Create: `app/services/delivery/alcoholRules.server.ts`

- [ ] **Step 1: Implement**
```ts
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import {
  MAX_ALCOHOL_COLLECTIONS,
  MAX_MESSAGE_LENGTH,
  MAX_MINIMUM_AGE,
  MIN_MINIMUM_AGE,
  defaultAlcoholRules,
  disabledStorefrontAlcoholRules,
  sanitizeAlcoholRules,
  toStorefrontAlcoholRules,
  type AlcoholRules,
  type StorefrontAlcoholRules,
} from "./alcoholRules";

export const alcoholRulesActionSchema = z.object({
  action: z.literal("save-alcohol-rules"),
  enabled: z.boolean(),
  collections: z.array(z.object({ id: z.string(), title: z.string() })).max(MAX_ALCOHOL_COLLECTIONS),
  ageCheckEnabled: z.boolean(),
  minimumAge: z.number().int().min(MIN_MINIMUM_AGE).max(MAX_MINIMUM_AGE),
  localOnlyEnabled: z.boolean(),
  notAloneEnabled: z.boolean(),
  ageMessage: z.string().max(MAX_MESSAGE_LENGTH),
  localOnlyMessage: z.string().max(MAX_MESSAGE_LENGTH),
  notAloneMessage: z.string().max(MAX_MESSAGE_LENGTH),
});
export type AlcoholRulesActionBody = z.infer<typeof alcoholRulesActionSchema>;

type Row = Awaited<ReturnType<PrismaClient["alcoholRules"]["findUnique"]>>;

const fromRow = (row: Row): AlcoholRules => (row ? sanitizeAlcoholRules(row as never) : defaultAlcoholRules());

export async function loadAlcoholRules(db: PrismaClient, shop: string): Promise<AlcoholRules> {
  return fromRow(await db.alcoholRules.findUnique({ where: { shop } }));
}

export async function saveAlcoholRules(db: PrismaClient, shop: string, body: AlcoholRulesActionBody): Promise<AlcoholRules> {
  const { action: _action, ...rest } = body;
  const data = sanitizeAlcoholRules(rest);
  await db.alcoholRules.upsert({ where: { shop }, create: { ...data, shop }, update: data });
  return data;
}

/** The master switch alone — usable on every plan so enforcement can always be turned off. */
export async function setAlcoholRulesEnabled(db: PrismaClient, shop: string, enabled: boolean): Promise<AlcoholRules> {
  const row = await db.alcoholRules.upsert({ where: { shop }, create: { shop, enabled }, update: { enabled } });
  return fromRow(row);
}

export async function rememberValidationId(db: PrismaClient, shop: string, validationId: string): Promise<void> {
  await db.alcoholRules.updateMany({ where: { shop, NOT: { validationId } }, data: { validationId } });
}

export async function loadStorefrontAlcoholRules(db: PrismaClient, shop: string): Promise<StorefrontAlcoholRules> {
  try {
    return toStorefrontAlcoholRules(await loadAlcoholRules(db, shop));
  } catch (error) {
    console.error("Error loading alcohol rules:", error); // eslint-disable-line no-console
    return disabledStorefrontAlcoholRules();
  }
}

/** True when zone edits must be pushed into the validation config. */
export async function alcoholLocalOnlyActive(db: PrismaClient, shop: string): Promise<boolean> {
  const row = await db.alcoholRules.findUnique({ where: { shop }, select: { enabled: true, localOnlyEnabled: true } });
  return Boolean(row?.enabled && row.localOnlyEnabled);
}
```
- [ ] **Step 2: Typecheck** `npx tsc --noEmit -p . 2>&1 | grep alcohol` → nothing. **Step 3: Commit** `git add app/services/delivery/alcoholRules.server.ts && git commit -m "Alcohol rules: persistence"`

---

### Task 5: Admin GraphQL documents + validation sync service

**Files:**
- Create: `app/models/shopify.server/graphql/validation.ts`
- Create: `app/services/delivery/alcoholValidation.server.ts`

- [ ] **Step 1: GraphQL documents** (validated against 2026-04)
```ts
export const GRAPHQL_QUERY_VALIDATION_FUNCTIONS = `#graphql
  query ValidationFunctions($first: Int!) {
    shopifyFunctions(first: $first, apiType: "cart_checkout_validation") {
      nodes { id title apiType app { handle } }
    }
  }
`;

export const GRAPHQL_QUERY_VALIDATIONS = `#graphql
  query Validations($first: Int!) {
    validations(first: $first) {
      nodes {
        id
        title
        enabled
        shopifyFunction { id app { handle } }
      }
    }
  }
`;

export const GRAPHQL_MUTATION_VALIDATION_CREATE = `#graphql
  mutation ValidationCreate($validation: ValidationCreateInput!) {
    validationCreate(validation: $validation) {
      validation { id enabled }
      userErrors { field message code }
    }
  }
`;

export const GRAPHQL_MUTATION_VALIDATION_UPDATE = `#graphql
  mutation ValidationUpdate($id: ID!, $validation: ValidationUpdateInput!) {
    validationUpdate(id: $id, validation: $validation) {
      validation { id enabled }
      userErrors { field message code }
    }
  }
`;
```
Then `npm run graphql-codegen` (may print unrelated warnings; must exit 0).

- [ ] **Step 2: Sync service** `app/services/delivery/alcoholValidation.server.ts`
```ts
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import type { PrismaClient } from "@prisma/client";
import {
  GRAPHQL_MUTATION_VALIDATION_CREATE,
  GRAPHQL_MUTATION_VALIDATION_UPDATE,
  GRAPHQL_QUERY_VALIDATIONS,
  GRAPHQL_QUERY_VALIDATION_FUNCTIONS,
} from "app/models/shopify.server/graphql/validation";
import { APP } from "app/constants/app.constants";
import { loadAlcoholRules, rememberValidationId } from "./alcoholRules.server";
import { buildAlcoholValidationConfig } from "./alcoholValidationConfig";

/** Handle of the function extension in extensions/alcohol-validation. */
export const ALCOHOL_FUNCTION_HANDLE = "alcohol-validation";
export const ALCOHOL_VALIDATION_TITLE = "Quali8 · Alcohol compliance";
export const ALCOHOL_METAFIELD_NAMESPACE = "$app";
export const ALCOHOL_METAFIELD_KEY = "alcohol-rules";

export type AlcoholValidationStatus =
  | { state: "active"; id: string }
  | { state: "off"; id: string }
  | { state: "missing" }
  | { state: "not-deployed" }
  | { state: "scope-missing"; message: string }
  | { state: "error"; message: string };

type GraphqlBody<T> = { data?: T; errors?: Array<{ message?: string }> };
type UserError = { field?: string[] | null; message: string; code?: string | null };

const looksLikeScopeError = (message: string) => /access denied|not approved|scope|permission/i.test(message);

async function read<T>(graphql: AdminGraphqlClient, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await graphql(query, { variables });
  const body = (await response.json()) as GraphqlBody<T>;
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message ?? "GraphQL error").join("; "));
  if (!body.data) throw new Error("Empty GraphQL response");
  return body.data;
}

const failure = (error: unknown): AlcoholValidationStatus => {
  const message = error instanceof Error ? error.message : "Unknown error";
  return looksLikeScopeError(message) ? { state: "scope-missing", message } : { state: "error", message };
};

async function functionDeployed(graphql: AdminGraphqlClient): Promise<boolean> {
  const data = await read<{ shopifyFunctions: { nodes: Array<{ id: string; title: string; app: { handle: string } | null }> } }>(
    graphql, GRAPHQL_QUERY_VALIDATION_FUNCTIONS, { first: 25 },
  );
  return data.shopifyFunctions.nodes.some((node) => node.app?.handle === APP.APP_HANDLE);
}

async function findValidation(graphql: AdminGraphqlClient) {
  const data = await read<{ validations: { nodes: Array<{ id: string; title: string; enabled: boolean; shopifyFunction: { id: string; app: { handle: string } | null } | null }> } }>(
    graphql, GRAPHQL_QUERY_VALIDATIONS, { first: 50 },
  );
  const ours = data.validations.nodes.filter((node) => node.shopifyFunction?.app?.handle === APP.APP_HANDLE);
  return ours.find((node) => node.title === ALCOHOL_VALIDATION_TITLE) ?? ours[0] ?? null;
}

/** Read-only: is the alcohol validation live on this shop? */
export async function detectAlcoholValidation(graphql: AdminGraphqlClient, db: PrismaClient, shop: string): Promise<AlcoholValidationStatus> {
  try {
    if (!(await functionDeployed(graphql))) return { state: "not-deployed" };
    const existing = await findValidation(graphql);
    if (!existing) return { state: "missing" };
    await rememberValidationId(db, shop, existing.id);
    return existing.enabled ? { state: "active", id: existing.id } : { state: "off", id: existing.id };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Creates or updates the Shopify validation so checkout enforces the saved
 * rules: `enable` follows the master switch, the config goes into the
 * `$app.alcohol-rules` json metafield (which also feeds the input-query
 * variable `collectionIds`).
 */
export async function syncAlcoholValidation(graphql: AdminGraphqlClient, db: PrismaClient, shop: string): Promise<AlcoholValidationStatus> {
  const status = await detectAlcoholValidation(graphql, db, shop);
  if (status.state !== "missing" && status.state !== "active" && status.state !== "off") return status;

  const [rules, zones] = await Promise.all([
    loadAlcoholRules(db, shop),
    db.deliveryZone.findMany({ where: { shop }, select: { active: true, zipCodes: true }, orderBy: [{ position: "asc" }, { id: "asc" }] }),
  ]);
  const config = buildAlcoholValidationConfig(rules, zones);
  const metafields = [{ namespace: ALCOHOL_METAFIELD_NAMESPACE, key: ALCOHOL_METAFIELD_KEY, type: "json", value: JSON.stringify(config) }];
  const enable = rules.enabled;

  try {
    let errors: UserError[];
    if (status.state === "missing") {
      const data = await read<{ validationCreate: { validation: { id: string } | null; userErrors: UserError[] } }>(
        graphql, GRAPHQL_MUTATION_VALIDATION_CREATE,
        { validation: { functionHandle: ALCOHOL_FUNCTION_HANDLE, title: ALCOHOL_VALIDATION_TITLE, enable, blockOnFailure: true, metafields } },
      );
      errors = data.validationCreate.userErrors;
      if (data.validationCreate.validation) await rememberValidationId(db, shop, data.validationCreate.validation.id);
    } else {
      const data = await read<{ validationUpdate: { validation: { id: string } | null; userErrors: UserError[] } }>(
        graphql, GRAPHQL_MUTATION_VALIDATION_UPDATE,
        { id: status.id, validation: { enable, metafields } },
      );
      errors = data.validationUpdate.userErrors;
    }
    if (errors.length) return { state: "error", message: errors.map((e) => e.message).join("; ") };
    return detectAlcoholValidation(graphql, db, shop);
  } catch (error) {
    return failure(error);
  }
}

/** Fire-and-forget variant for zone edits: never throws. */
export async function syncAlcoholValidationQuietly(graphql: AdminGraphqlClient, db: PrismaClient, shop: string): Promise<void> {
  try {
    const status = await syncAlcoholValidation(graphql, db, shop);
    if (status.state === "error" || status.state === "scope-missing") {
      console.warn("Alcohol validation sync:", status.message); // eslint-disable-line no-console
    }
  } catch (error) {
    console.error("Alcohol validation sync failed:", error); // eslint-disable-line no-console
  }
}
```
- [ ] **Step 3: Typecheck** clean for these files. **Step 4: Commit** `git add app/models/shopify.server/graphql/validation.ts app/services/delivery/alcoholValidation.server.ts app/types && git commit -m "Alcohol rules: Shopify validation sync"` (only add `app/types` files that codegen changed and relate to this; check `git status app/types`).

---

### Task 6: The validation function (TDD)

**Files:**
- Modify: `extensions/alcohol-validation/shopify.extension.toml` (add input variables, ui paths, description)
- Modify: `extensions/alcohol-validation/locales/en.default.json`
- Create: `extensions/alcohol-validation/tsconfig.json` (copy of delivery-method-filter's)
- Create: `extensions/alcohol-validation/src/rules.ts`, `src/rules.test.ts`
- Modify: `extensions/alcohol-validation/src/cart_validations_generate_run.graphql`, `.ts`; create `.test.ts`
- Delete: `extensions/alcohol-validation/tests/` (the wasm integration harness; the sibling function has none) and drop `@shopify/shopify-function-test-helpers` from package.json devDependencies

- [ ] **Step 1: toml**
```toml
api_version = "2026-04"

[[extensions]]
name = "t:name"
handle = "alcohol-validation"
type = "function"
uid = "<keep the generated uid>"
description = "t:description"

  [[extensions.targeting]]
  target = "cart.validations.generate.run"
  input_query = "src/cart_validations_generate_run.graphql"
  export = "cart-validations-generate-run"

  [extensions.build]
  command = ""
  path = "dist/function.wasm"

  [extensions.input.variables]
  namespace = "$app"
  key = "alcohol-rules"

  [extensions.ui.paths]
  create = "/app/delivery"
  details = "/app/delivery"
```
locales: `{ "name": "Alcohol compliance", "description": "Blocks checkout when alcohol rules fail: age confirmation, local delivery only, not sold alone." }`

- [ ] **Step 2: Input query**
```graphql
query CartValidationsGenerateRunInput($collectionIds: [ID!]! = []) {
  buyerJourney {
    step
  }
  validation {
    metafield(namespace: "$app", key: "alcohol-rules") {
      jsonValue
    }
  }
  cart {
    deliveryMethod: attribute(key: "Delivery method") {
      value
    }
    dateOfBirth: attribute(key: "Date of birth") {
      value
    }
    ageConfirmed: attribute(key: "Age confirmed") {
      value
    }
    lines {
      quantity
      merchandise {
        __typename
        ... on ProductVariant {
          product {
            isAlcohol: inAnyCollection(ids: $collectionIds)
          }
        }
      }
    }
    deliveryGroups {
      deliveryAddress {
        zip
      }
      selectedDeliveryOption {
        deliveryMethodType
      }
    }
  }
}
```
Run `npm run typegen` in the extension dir → regenerates `generated/api.ts`.

- [ ] **Step 3: `src/rules.ts`** (pure copy of the app's evaluator + zip matcher; same fixtures)
```ts
/**
 * Pure alcohol rule evaluation for the function. Mirrors
 * app/services/delivery/alcoholRules.ts (evaluateAlcoholCart) and
 * deliveryZones.ts (zip matching); both run ../fixtures/rules.json.
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

export type Rules = { enabled: boolean; minimumAge: number; ageCheck: boolean; localOnly: boolean; notAlone: boolean; messages: Messages };
export type Method = "delivery" | "pickup" | null;
export type Summary = { rules: Rules; alcoholLineCount: number; otherLineCount: number; method: Method; zipDeliverable: boolean | null; zip?: string | null; dob: string | null; confirmed: boolean };
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
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key: string) => (values[key] === null || values[key] === undefined ? "" : String(values[key])));
}

export function normalizeZip(input: string | null | undefined): string {
  return String(input ?? "").toUpperCase().replace(/\s+/g, "").slice(0, 12);
}

export function zipMatches(zip: string, entry: string): boolean {
  const code = normalizeZip(zip);
  if (!code) return false;
  if (entry.endsWith("*")) return code.startsWith(entry.slice(0, -1));
  if (code === entry) return true;
  const base = code.split("-")[0];
  return base !== code && base === entry;
}

export function zipInZones(zip: string | null | undefined, zips: string[]): boolean {
  if (!zip) return false;
  return zips.some((entry) => zipMatches(zip, entry));
}

export function configToRules(config: Config): Rules {
  return { enabled: config.collectionIds.length > 0, minimumAge: config.minimumAge, ageCheck: config.ageCheck, localOnly: config.localOnly, notAlone: config.notAlone, messages: config.messages };
}

/** "Pickup" / "Delivery" attribute (any case) → method. */
export function chosenMethod(value: string | null | undefined): Method {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pickup") return "pickup";
  if (normalized === "delivery") return "delivery";
  return null;
}

export function evaluate(s: Summary): Problem[] {
  const { rules } = s;
  if (!rules.enabled || s.alcoholLineCount <= 0) return [];
  const problems: Problem[] = [];
  const values = { age: rules.minimumAge, zip: s.zip ?? "" };
  if (rules.notAlone && s.otherLineCount <= 0) problems.push({ rule: "notAlone", message: fillMessage(rules.messages.notAlone, values) });
  if (rules.localOnly && s.method !== "pickup" && s.zipDeliverable !== true) problems.push({ rule: "localOnly", message: fillMessage(rules.messages.localOnly, values).trim() });
  if (rules.ageCheck && (!isIsoDate(s.dob) || !s.confirmed)) problems.push({ rule: "age", message: fillMessage(rules.messages.age, values) });
  return problems;
}
```
`src/rules.test.ts`: iterate `../fixtures/rules.json` exactly like the app test (same expectations), plus `zipInZones("33101-1234", ["33101"])` true, `zipInZones("33199", ["331*"])` true, `zipInZones("40000", ["331*"])` false.

- [ ] **Step 4: Function test** `src/cart_validations_generate_run.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { cartValidationsGenerateRun } from "./cart_validations_generate_run";
import type { CartValidationsGenerateRunInput } from "../generated/api";

const config = { collectionIds: ["gid://shopify/Collection/1"], minimumAge: 21, ageCheck: true, localOnly: true, notAlone: true, zips: ["331*"], messages: { age: "Age {age}", localOnly: "Local", notAlone: "Alone" } };

type Line = { alcohol: boolean };
function input(opts: { step?: string; lines?: Line[]; method?: string | null; dob?: string | null; confirmed?: string | null; zip?: string | null; selected?: string | null; config?: object | null }): CartValidationsGenerateRunInput {
  const lines = opts.lines ?? [{ alcohol: true }, { alcohol: false }];
  return {
    buyerJourney: { step: (opts.step ?? "CHECKOUT_INTERACTION") as never },
    validation: { metafield: opts.config === null ? null : { jsonValue: opts.config ?? config } },
    cart: {
      deliveryMethod: opts.method === undefined ? { value: "Delivery" } : opts.method === null ? null : { value: opts.method },
      dateOfBirth: opts.dob === undefined ? { value: "1990-01-01" } : opts.dob === null ? null : { value: opts.dob },
      ageConfirmed: opts.confirmed === undefined ? { value: "Yes" } : opts.confirmed === null ? null : { value: opts.confirmed },
      lines: lines.map((l) => ({ quantity: 1, merchandise: { __typename: "ProductVariant", product: { isAlcohol: l.alcohol } } })),
      deliveryGroups: [{ deliveryAddress: opts.zip === null ? null : { zip: opts.zip ?? "33101" }, selectedDeliveryOption: opts.selected === null ? null : { deliveryMethodType: (opts.selected ?? "SHIPPING") as never } }],
    },
  } as CartValidationsGenerateRunInput;
}
const errors = (i: CartValidationsGenerateRunInput) => cartValidationsGenerateRun(i).operations.flatMap((op) => op.validationAdd?.errors ?? []);

describe("alcohol validation", () => {
  it("passes a compliant cart", () => expect(errors(input({}))).toEqual([]));
  it("stays silent at cart interaction", () => expect(errors(input({ step: "CART_INTERACTION", lines: [{ alcohol: true }] }))).toEqual([]));
  it("stays silent without config or without alcohol", () => {
    expect(errors(input({ config: null, lines: [{ alcohol: true }] }))).toEqual([]);
    expect(errors(input({ lines: [{ alcohol: false }] }))).toEqual([]);
  });
  it("blocks alcohol alone on the cart", () => expect(errors(input({ lines: [{ alcohol: true }] }))).toEqual([{ message: "Alone", target: "$.cart" }]));
  it("blocks delivery outside the zones on the zip field", () => {
    expect(errors(input({ zip: "90210" }))).toEqual([{ message: "Local", target: "$.cart.deliveryGroups[0].deliveryAddress.zip" }]);
    expect(errors(input({ zip: null }))).toHaveLength(1);
  });
  it("lets pickup through regardless of zip", () => {
    expect(errors(input({ zip: "90210", method: "Pickup" }))).toEqual([]);
    expect(errors(input({ zip: "90210", method: null, selected: "PICK_UP" }))).toEqual([]);
  });
  it("requires the age attributes", () => {
    expect(errors(input({ dob: null }))).toEqual([{ message: "Age 21", target: "$.cart" }]);
    expect(errors(input({ confirmed: "no" }))).toHaveLength(1);
    expect(errors(input({ dob: "1/1/1990" }))).toHaveLength(1);
  });
  it("also blocks at checkout completion", () => expect(errors(input({ step: "CHECKOUT_COMPLETION", dob: null }))).toHaveLength(1));
});
```
- [ ] **Step 5: Run** `cd extensions/alcohol-validation && npx vitest run` → FAIL. **Step 6: Implement**
```ts
/**
 * Quali8 — Alcohol compliance (Cart & Checkout Validation Function).
 *
 * Reads the rules the merchant saved on the Delivery page from the
 * validation's `$app.alcohol-rules` metafield (the same JSON also binds the
 * `$collectionIds` input variable) and blocks checkout when a cart with
 * alcohol breaks one: not sold alone, delivery outside the zones, missing
 * age confirmation. Nothing happens at cart interaction so shoppers can
 * still build the cart and the cart block can guide them.
 */
import type { CartValidationsGenerateRunInput, CartValidationsGenerateRunResult, ValidationError } from "../generated/api";
import { chosenMethod, configToRules, evaluate, zipInZones, type Config, type Method } from "./rules";

const NO_OPERATIONS: CartValidationsGenerateRunResult = { operations: [] };
const ZIP_TARGET = "$.cart.deliveryGroups[0].deliveryAddress.zip";
const CART_TARGET = "$.cart";

function readConfig(input: CartValidationsGenerateRunInput): Config | null {
  const value = input.validation?.metafield?.jsonValue as Partial<Config> | null | undefined;
  if (!value || !Array.isArray(value.collectionIds) || value.collectionIds.length === 0) return null;
  return {
    collectionIds: value.collectionIds,
    minimumAge: Number(value.minimumAge) || 21,
    ageCheck: value.ageCheck !== false,
    localOnly: value.localOnly !== false,
    notAlone: value.notAlone !== false,
    zips: Array.isArray(value.zips) ? value.zips : [],
    messages: { age: String(value.messages?.age ?? ""), localOnly: String(value.messages?.localOnly ?? ""), notAlone: String(value.messages?.notAlone ?? "") },
  };
}

export function cartValidationsGenerateRun(input: CartValidationsGenerateRunInput): CartValidationsGenerateRunResult {
  if (input.buyerJourney?.step === "CART_INTERACTION") return NO_OPERATIONS;
  const config = readConfig(input);
  if (!config) return NO_OPERATIONS;

  let alcoholLineCount = 0;
  let otherLineCount = 0;
  for (const line of input.cart?.lines ?? []) {
    const m = line.merchandise;
    if (m.__typename === "ProductVariant" && m.product.isAlcohol) alcoholLineCount += 1;
    else otherLineCount += 1;
  }
  if (alcoholLineCount === 0) return NO_OPERATIONS;

  const group = input.cart?.deliveryGroups?.[0];
  const selected = group?.selectedDeliveryOption?.deliveryMethodType;
  const method: Method = chosenMethod(input.cart?.deliveryMethod?.value) ?? (selected === "PICK_UP" ? "pickup" : "delivery");
  const zip = group?.deliveryAddress?.zip ?? null;

  const problems = evaluate({
    rules: configToRules(config),
    alcoholLineCount,
    otherLineCount,
    method,
    zipDeliverable: zipInZones(zip, config.zips),
    zip,
    dob: input.cart?.dateOfBirth?.value ?? null,
    confirmed: String(input.cart?.ageConfirmed?.value ?? "").trim().toLowerCase() === "yes",
  });
  if (!problems.length) return NO_OPERATIONS;

  const errors: ValidationError[] = problems.map((p) => ({ message: p.message, target: p.rule === "localOnly" ? ZIP_TARGET : CART_TARGET }));
  return { operations: [{ validationAdd: { errors } }] };
}
```
- [ ] **Step 7: Run** tests → PASS; `npm run build` in the extension → `dist/function.wasm` produced (dist is gitignored).
- [ ] **Step 8: Commit** `git add extensions/alcohol-validation && git commit -m "Alcohol compliance: cart & checkout validation function"` (verify `git status --short extensions/alcohol-validation` shows no node_modules/dist).

---

### Task 7: Storefront proxies

**Files:**
- Modify: `app/services/delivery/deliverySchedule.server.ts` (`StorefrontSchedule`, `emptyStorefrontSchedule`, `loadStorefrontSchedule`)
- Modify: `app/services/delivery/deliveryZones.server.ts` (`checkDelivery` gets `{ ignoreSwitch }`)
- Modify: `app/routes/proxy.delivery-check/route.tsx` (`zones=1` param)
- Create: `app/services/delivery/alcoholProducts.ts` (+ test), `app/services/delivery/alcoholProducts.server.ts`
- Create: `app/routes/proxy.alcohol-check/route.tsx`

- [ ] **Step 1: Schedule payload** — add `alcohol: StorefrontAlcoholRules` to the type, `alcohol: disabledStorefrontAlcoholRules()` to `emptyStorefrontSchedule`, and load `loadStorefrontAlcoholRules(db, shop)` in the `Promise.all` of `loadStorefrontSchedule`, returning it as `alcohol`.

- [ ] **Step 2: checkDelivery** — signature `checkDelivery(db, shop, rawZip, options: { ignoreSwitch?: boolean } = {})`; the early return becomes `if ((!store?.deliveryCheckEnabled && !options.ignoreSwitch) || !zip)`. `proxy.delivery-check`: `const ignoreSwitch = url.searchParams.get("zones") === "1";` passed through. Doc comment: "`zones=1` matches the zones even when the merchant's checker switch is off (used by the cart block's alcohol local-only rule)".

- [ ] **Step 3: Pure reducer** `alcoholProducts.ts` + test:
```ts
/** Which of the requested products sit in any alcohol collection. Pure. */
export type ProductMembership = { id: string; flags: boolean[] } | null;

export function restrictedProductIds(nodes: ProductMembership[]): string[] {
  return nodes.flatMap((node) => (node && node.flags.some(Boolean) ? [node.id] : []));
}

/** "1,2,x" → ["gid://shopify/Product/1", …]; max 100 distinct numeric ids. */
export function parseProductIds(raw: string | null): string[] {
  const seen = new Set<string>();
  for (const part of String(raw ?? "").split(",")) {
    const id = part.trim();
    if (/^\d+$/.test(id)) seen.add(`gid://shopify/Product/${id}`);
    if (seen.size >= 100) break;
  }
  return Array.from(seen);
}

export const numericId = (gid: string) => gid.split("/").pop() ?? gid;

/** Builds `nodes(ids) { ... on Product { id c0: inCollection(id:$c0) … } }` for N collections. */
export function membershipQuery(collectionCount: number): string {
  const vars = Array.from({ length: collectionCount }, (_, i) => `$c${i}: ID!`).join(", ");
  const fields = Array.from({ length: collectionCount }, (_, i) => `c${i}: inCollection(id: $c${i})`).join(" ");
  return `query AlcoholMembership($ids: [ID!]!, ${vars}) { nodes(ids: $ids) { ... on Product { id ${fields} } } }`;
}
```
Tests: `restrictedProductIds([{id:"a",flags:[false,true]},{id:"b",flags:[false]},null])` → `["a"]`; `parseProductIds("1, 2,x,1")` → two GIDs; `membershipQuery(2)` contains `$c1: ID!` and `c1: inCollection(id: $c1)`.

- [ ] **Step 4: Server resolver** `alcoholProducts.server.ts`:
```ts
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import type { PrismaClient } from "@prisma/client";
import { loadAlcoholRules } from "./alcoholRules.server";
import { membershipQuery, numericId, restrictedProductIds, type ProductMembership } from "./alcoholProducts";

export type AlcoholCheckResult = { enabled: boolean; restricted: string[] };
export const EMPTY_ALCOHOL_CHECK: AlcoholCheckResult = { enabled: false, restricted: [] };

/** Numeric product ids (as the storefront sent them) that are alcohol. */
export async function checkAlcoholProducts(db: PrismaClient, graphql: AdminGraphqlClient, shop: string, productGids: string[]): Promise<AlcoholCheckResult> {
  const rules = await loadAlcoholRules(db, shop);
  if (!rules.enabled || rules.collections.length === 0) return EMPTY_ALCOHOL_CHECK;
  if (productGids.length === 0) return { enabled: true, restricted: [] };

  const variables: Record<string, unknown> = { ids: productGids };
  rules.collections.forEach((c, i) => { variables[`c${i}`] = c.id; });
  const response = await graphql(membershipQuery(rules.collections.length), { variables });
  const body = (await response.json()) as { data?: { nodes: Array<Record<string, unknown> | null> }; errors?: Array<{ message?: string }> };
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));

  const nodes: ProductMembership[] = (body.data?.nodes ?? []).map((node) =>
    node && typeof node.id === "string" ? { id: node.id, flags: rules.collections.map((_, i) => node[`c${i}`] === true) } : null,
  );
  return { enabled: true, restricted: restrictedProductIds(nodes).map(numericId) };
}
```
- [ ] **Step 5: Proxy route** `app/routes/proxy.alcohol-check/route.tsx` (mirror `proxy.delivery-check`): `authenticate.public.appProxy`; `shop`, `admin`; headers `Cache-Control: public, max-age=120`; return `EMPTY_ALCOHOL_CHECK` when no shop/admin, when `!(await getShopPlan(shop, db)).hasShippingDiscounts`, or on error (log); else `checkAlcoholProducts(db, admin.graphql, shop, parseProductIds(url.searchParams.get("products")))`.
- [ ] **Step 6: Tests + typecheck**, then commit: `git add app/services/delivery/deliverySchedule.server.ts app/services/delivery/deliveryZones.server.ts app/routes/proxy.delivery-check/route.tsx app/services/delivery/alcoholProducts.ts app/services/delivery/alcoholProducts.test.ts app/services/delivery/alcoholProducts.server.ts app/routes/proxy.alcohol-check && git commit -m "Alcohol rules: storefront payload and alcohol-check proxy"`

---

### Task 8: Cart block

**Files:**
- Modify: `extensions/theme-quali8/assets/delivery-checkout.js`
- Modify: `extensions/theme-quali8/assets/delivery-checkout.css`
- Modify: `extensions/theme-quali8/blocks/delivery-checkout.liquid` (header comment only)

- [ ] **Step 1: Attributes and helpers.** In `ATTR` add `dob: "Date of birth", ageConfirmed: "Age confirmed"`. After `prettyDate` add:
```js
  // --- Alcohol rules (from the merchant's Delivery page, via the schedule payload) --
  var ALCOHOL_OFF = { enabled: false, minimumAge: 21, ageCheck: false, localOnly: false, notAlone: false, messages: {} };
  function alcoholRules() {
    return (schedule && schedule.alcohol && schedule.alcohol.enabled && schedule.alcohol) || ALCOHOL_OFF;
  }
  function alcoholInCart() {
    return alcoholRules().enabled && state.alcohol.restrictedIds.length > 0;
  }
  function ageRequired() { return alcoholInCart() && alcoholRules().ageCheck; }
  function alcoholLocalOnly() { return alcoholInCart() && alcoholRules().localOnly; }
  function notAloneBlocked() { return alcoholInCart() && alcoholRules().notAlone && !state.alcohol.hasOther; }
  function isIsoDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!m) return false;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    var date = new Date(Date.UTC(y, mo - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  }
  function isOfAge(dob, today, minimumAge) {
    if (!isIsoDate(dob) || !isIsoDate(today)) return false;
    var b = dob.split("-").map(Number), t = today.split("-").map(Number);
    var age = t[0] - b[0];
    if (t[1] < b[1] || (t[1] === b[1] && t[2] < b[2])) age -= 1;
    return age >= minimumAge;
  }
  function dobOk() { return isIsoDate(state.age.dob) && isOfAge(state.age.dob, isoToday(), alcoholRules().minimumAge); }
  function ageValid() { return !ageRequired() || (dobOk() && state.age.confirmed); }
  function alcoholMessage(key) { return fill((alcoholRules().messages || {})[key] || "", { age: alcoholRules().minimumAge, zip: state.zip }); }
  function fetchAlcoholCheck(ids) {
    return fetchJson("apps/quali8/alcohol-check?products=" + encodeURIComponent(ids.join(",")));
  }
  // Ask the app which cart products are alcohol; re-render when the answer changes.
  function refreshAlcohol() {
    if (!alcoholRules().enabled || !cartData || !cartData.items || !cartData.items.length) {
      var was = state.alcohol.restrictedIds.length;
      state.alcohol = { restrictedIds: [], hasOther: true, checked: true };
      return Promise.resolve(was > 0);
    }
    var ids = [];
    cartData.items.forEach(function (item) { if (item.product_id && ids.indexOf(String(item.product_id)) < 0) ids.push(String(item.product_id)); });
    return fetchAlcoholCheck(ids)
      .then(function (result) {
        var restricted = (result && result.restricted) || [];
        var hasOther = cartData.items.some(function (item) { return restricted.indexOf(String(item.product_id)) < 0; });
        var changed = restricted.join(",") !== state.alcohol.restrictedIds.join(",") || hasOther !== state.alcohol.hasOther;
        state.alcohol = { restrictedIds: restricted, hasOther: hasOther, checked: true };
        return changed;
      })
      .catch(function () {
        state.alcohol = { restrictedIds: [], hasOther: true, checked: true };
        return false;
      });
  }
```
(`fetchJson` is defined before; `schedule`, `state`, `cartData` are hoisted `var`s.)

- [ ] **Step 2: State.** In `initialState` add `age: { dob: a("dob"), confirmed: a("ageConfirmed") === "Yes" }, alcohol: { restrictedIds: [], hasOther: true, checked: false },`.

- [ ] **Step 3: Validity.** `senderValid()`: add `if (!ageValid()) return false;` before `return true`. `methodValid()` delivery branch: `(state.deliverable || (!checkerOn && !alcoholLocalOnly()))`. `summaryValid()`: `return !notAloneBlocked() && senderValid() && methodValid();`.

- [ ] **Step 4: Attributes.** In `patchFor()` after the `door` line: 
```js
    var ageOk = ageRequired() && dobOk();
    p[ATTR.dob] = ageOk ? state.age.dob : "";
    p[ATTR.ageConfirmed] = ageOk && state.age.confirmed ? "Yes" : "";
```

- [ ] **Step 5: Notice.** In `renderShell` create `noticeNode = el("div", "q8-dc__notice"); noticeNode.hidden = true; block.appendChild(noticeNode);` **before** `layout` is appended; declare `var noticeNode = null;` next to `statusNode`. Add:
```js
  function renderAlcoholNotice() {
    if (!noticeNode) return;
    var blocked = notAloneBlocked();
    noticeNode.textContent = "";
    noticeNode.hidden = !blocked;
    if (!blocked) return;
    noticeNode.appendChild(icon("bag"));
    var body = el("div", "q8-dc__notice-body");
    body.appendChild(el("p", "q8-dc__notice-text", alcoholMessage("notAlone")));
    var link = el("a", "q8-dc__notice-link", settings.empty.cta || "Keep shopping");
    link.href = ROOT + "collections/all";
    body.appendChild(link);
    noticeNode.appendChild(body);
  }
```
Call `renderAlcoholNotice()` at the top of `go()` (after `state.step = step`).

- [ ] **Step 6: Age card** in `renderSender`, after `panel.appendChild(recipientCard);`:
```js
    if (ageRequired()) {
      var ageCard = el("div", "q8-dc__card q8-dc__age");
      ageCard.appendChild(el("h4", "q8-dc__card-title", settings.alcohol.title));
      ageCard.appendChild(el("p", "q8-dc__note", fill(settings.alcohol.intro, { age: alcoholRules().minimumAge })));
      var confirm;
      var dob = field({ id: "q8-dc-dob", label: settings.alcohol.dobLabel, type: "date", autocomplete: "bday", value: state.age.dob, onChange: function (event) {
        state.age.dob = event.target.value;
        var under = isIsoDate(state.age.dob) && !dobOk();
        dob.setError(under ? alcoholMessage("age") : "");
        confirm.querySelector("input").disabled = !dobOk();
        if (!dobOk()) { state.age.confirmed = false; confirm.querySelector("input").checked = false; }
        save(patchFor());
        refreshContinue();
      } });
      dob.control.max = isoToday();
      ageCard.appendChild(dob.wrap);
      confirm = toggle(fill(settings.alcohol.confirmLabel, { age: alcoholRules().minimumAge }), state.age.confirmed, function (checked) {
        state.age.confirmed = checked;
        save(patchFor());
        refreshContinue();
      });
      confirm.querySelector("input").disabled = !dobOk();
      if (isIsoDate(state.age.dob) && !dobOk()) dob.setError(alcoholMessage("age"));
      ageCard.appendChild(confirm);
      panel.appendChild(ageCard);
    }
```
Defaults (bootstrap section next to `settings.empty`):
```js
  settings.alcohol = settings.alcohol || {
    title: "Age verification",
    intro: "Your order contains alcohol. You must be {age} or older to continue.",
    dobLabel: "Date of birth",
    confirmLabel: "I confirm that I and the recipient are {age} or older and that an adult with valid ID will receive the order.",
  };
```

- [ ] **Step 7: Zip step.** In `renderDelivery`: `if (checkerOn || alcoholLocalOnly()) {` … failure text: `note.textContent = alcoholLocalOnly() && !checkerOn ? alcoholMessage("localOnly") : fill(m.failText || …)`. Hmm — when the checker is on *and* alcohol is in the cart, still prefer the alcohol wording: use `alcoholLocalOnly() ? alcoholMessage("localOnly") || fill(m.failText…) : fill(m.failText…)`. `checkZip(zip)` gains a second arg: `function checkZip(zip, zones)` appending `&zones=1` when `zones`; the submit handler passes `alcoholLocalOnly()`. The bootstrap probe also passes `true` so a remembered zip validates against zones even with the switch off, but only trust `deliverable` when `checkerOn || alcoholLocalOnly()` — since `schedule` isn't loaded yet at probe time, store the probe result in `var probe = null` and resolve after `Promise.all`: 
```js
    if (probe && state.zip && probe.deliverable && (checkerOn || alcoholLocalOnly())) { state.zone = probe.zone || null; state.deliverable = true; }
```
(Move the existing "remembered zip" assignment out of the probe `.then` into this post-`refreshAlcohol` spot.)

- [ ] **Step 8: Cart reloads.** `reloadCart()`: after `cartData = cart;` → `return refreshAlcohol().then(function (changed) { if (changed) go(state.step); return cart; });`. Bootstrap: replace `.then(function () { go(1); syncTimedProperty(); })` with `.then(function () { return refreshAlcohol(); }).then(function () { /* remembered zip (Step 7) */ go(1); syncTimedProperty(); })`.

- [ ] **Step 9: Summary row.** In `renderSummary`, when `ageRequired()` add `row(settings.alcohol.title, [settings.alcohol.dobLabel + ": " + state.age.dob, state.age.confirmed ? "Confirmed" : ""], 1);` after the recipient row.

- [ ] **Step 10: CSS** append:
```css
/* Alcohol rules: cart-wide notice above the steps */
.q8-dc__notice {
  display: flex;
  gap: 0.75em;
  align-items: flex-start;
  margin: 0 0 1em;
  padding: 0.875em 1em;
  border-radius: var(--q8-dc-radius, 16px);
  background: rgba(180, 35, 24, 0.08);
  color: #b42318;
}
.q8-dc__notice svg { flex: none; margin-top: 0.15em; }
.q8-dc__notice-body { display: flex; flex-direction: column; gap: 0.35em; }
.q8-dc__notice-text { margin: 0; font-weight: 600; }
.q8-dc__notice-link { color: inherit; font-weight: 600; text-decoration: underline; }
.q8-dc__age .q8-dc__toggle { align-items: flex-start; }
.q8-dc__age .q8-dc__toggle-label { line-height: 1.4; }
```
- [ ] **Step 11: Liquid header comment**: add a line "Alcohol rules (from the Delivery page): age verification on step 1, local-only zip check, and a cart-wide 'not sold alone' notice." Do **not** add settings.
- [ ] **Step 12: Syntax check** `node --check extensions/theme-quali8/assets/delivery-checkout.js`. Commit: `git add extensions/theme-quali8/assets/delivery-checkout.js extensions/theme-quali8/assets/delivery-checkout.css extensions/theme-quali8/blocks/delivery-checkout.liquid && git commit -m "Delivery checkout: alcohol age check, local-only zip, not-sold-alone notice"`

---

### Task 9: Delivery page card

**Files:**
- Create: `app/components/Delivery/AlcoholRulesEditor.tsx`
- Modify: `app/routes/app.delivery._index/loader/index.ts`, `action/index.ts`, `route.tsx`

- [ ] **Step 1: Loader** — import `loadAlcoholRules`, `detectAlcoholValidation`, types; add to `DeliveryPageData`: `alcohol: AlcoholRules; alcoholValidation: AlcoholValidationStatus;`. In the `Promise.all` add `loadAlcoholRules(db, session.shop)` and `detectAlcoholValidation(admin.graphql, db, session.shop)` (the latter never throws). Return both.

- [ ] **Step 2: Action** — add to `bodySchema`: `alcoholRulesActionSchema`, `z.object({ action: z.literal("retry-alcohol-sync") })`, `z.object({ action: z.literal("disable-alcohol-rules") })`. `ZONE_ACTIONS` also contains `"disable-alcohol-rules"`. Cases:
```ts
      case "save-alcohol-rules": {
        await saveAlcoholRules(db, session.shop, body);
        const status = await syncAlcoholValidation(admin.graphql, db, session.shop);
        return { code: "alcohol-rules-saved", status, errors: null };
      }
      case "retry-alcohol-sync": {
        const status = await syncAlcoholValidation(admin.graphql, db, session.shop);
        return { code: "alcohol-sync-done", status, errors: null };
      }
      case "disable-alcohol-rules": {
        await setAlcoholRulesEnabled(db, session.shop, false);
        const status = await syncAlcoholValidation(admin.graphql, db, session.shop);
        return { code: "alcohol-rules-saved", status, errors: null };
      }
```
Default branch (zones): 
```ts
      default: {
        const result = await runDeliveryAction({ db, shop: session.shop, body });
        if (result.code !== "error" && body.action !== "set-delivery-check" && (await alcoholLocalOnlyActive(db, session.shop))) {
          await syncAlcoholValidationQuietly(admin.graphql, db, session.shop);
        }
        return result;
      }
```
- [ ] **Step 3: Component** `AlcoholRulesEditor.tsx` — props `{ rules: AlcoholRules; status: AlcoholValidationStatus; editable: boolean }`. Local draft state; `pickCollections` via `shopify.resourcePicker({ type: "collection", multiple: MAX_ALCOHOL_COLLECTIONS, selectionIds: draft.collections.map((c) => ({ id: c.id })) })` mapping `{ id, title }`; a `ResourceList`-free simple list (InlineStack of `Tag` components with `onRemove`). Status badge map: active → success "Active"; off → attention "Turned off"; missing → attention "Not installed yet (saves install it)"; not-deployed → critical "Not deployed"; scope-missing → critical "Permission missing" + text "The app needs the write_validations permission. Deploy the new configuration, reopen the app and accept it."; error → critical "Error" + message. Fetcher result `{ code, status, errors }` updates a local `status` state and toasts "Alcohol rules saved". Non-editable mode: every control `disabled` except the master switch; Save posts `disable-alcohol-rules` and is disabled while the switch is on; an info Banner "Alcohol rules are an Advance feature. You can switch enforcement off here." Retry button posts `retry-alcohol-sync`. Warning Banner when `draft.enabled && draft.collections.length === 0`.
- [ ] **Step 4: Route** — render a Card titled "Alcohol rules" with subtitle "Age verification, local-delivery-only and not-sold-alone rules for products in the collections you pick. Enforced in the cart block and again at checkout." followed by `<AlcoholRulesEditor key={JSON.stringify(data?.alcohol)} rules={data?.alcohol ?? defaultAlcoholRules()} status={data?.alcoholValidation ?? { state: "missing" }} editable={fullAccess} />`. Place it after the Options step card in the full branch and after the upgrade Banner in the zones-only branch (define `alcoholCard` once like `zonesCard`). Add "Alcohol rules: age check, local-only delivery, not sold alone" to the upgrade Banner list.
- [ ] **Step 5:** `npx tsc --noEmit -p .` clean for touched files; `npm run lint` for touched files; `npm run build` succeeds. Commit: `git add app/components/Delivery/AlcoholRulesEditor.tsx app/routes/app.delivery._index && git commit -m "Delivery page: Alcohol rules card with checkout enforcement status"`

---

### Task 10: Docs, verification, push

- [ ] **Step 1: CLAUDE.md** — in the Delivery Zones & Rates paragraph add: "**Alcohol rules** (card on the Delivery page, model `AlcoholRules`, pure `app/services/delivery/alcoholRules.ts`, tested): age check (DOB + confirmation, cart attributes `Date of birth` / `Age confirmed`), local delivery only (zip must match a zone; pickup exempt), not sold alone, for products in merchant-picked collections. Enforced twice: the cart block (rules travel in the `proxy.delivery-schedule` payload as `alcohol`; `proxy.alcohol-check?products=` says which cart products are alcohol via Admin `inCollection`) and the Cart & Checkout Validation function `extensions/alcohol-validation` (reads the validation's `$app.alcohol-rules` json metafield written by `syncAlcoholValidation` on every save and zone edit; `collectionIds` in that JSON binds the input-query variable). Needs the **`write_validations` scope** (add by hand to `shopify.app.toml`). Functions have no clock: the function checks presence/format of the age attributes; the widget decides underage. `proxy.delivery-check?zones=1` matches zones even with the checker switch off."
- [ ] **Step 2: Full verification**: `npx vitest run` (root), `cd extensions/alcohol-validation && npx vitest run && npm run build`, `npm run build` (root), `npm run lint`.
- [ ] **Step 3: Commit docs** `git add CLAUDE.md docs/superpowers/plans/2026-09-16-alcohol-compliance.md && git commit -m "Docs: alcohol compliance rules"`.
- [ ] **Step 4: Push** `git push origin main` (user asked for main). Report the manual steps: add `write_validations` to `shopify.app.toml`, `npm run deploy`, reopen the app to accept the scope, then save the card once.
