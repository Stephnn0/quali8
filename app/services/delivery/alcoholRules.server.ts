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

/** The "Alcohol rules" card saves everything at once. */
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

const fromRow = (row: Row): AlcoholRules =>
  row ? sanitizeAlcoholRules(row as unknown as Partial<Record<keyof AlcoholRules, unknown>>) : defaultAlcoholRules();

export async function loadAlcoholRules(db: PrismaClient, shop: string): Promise<AlcoholRules> {
  return fromRow(await db.alcoholRules.findUnique({ where: { shop } }));
}

export async function saveAlcoholRules(
  db: PrismaClient,
  shop: string,
  body: AlcoholRulesActionBody,
): Promise<AlcoholRules> {
  const { action: _action, ...rest } = body;
  const data = sanitizeAlcoholRules(rest);
  await db.alcoholRules.upsert({
    where: { shop },
    create: { ...data, shop },
    update: data,
  });
  return data;
}

/** The master switch alone — usable on every plan so enforcement can always be turned off. */
export async function setAlcoholRulesEnabled(db: PrismaClient, shop: string, enabled: boolean): Promise<AlcoholRules> {
  const row = await db.alcoholRules.upsert({
    where: { shop },
    create: { shop, enabled },
    update: { enabled },
  });
  return fromRow(row);
}

export async function rememberValidationId(db: PrismaClient, shop: string, validationId: string): Promise<void> {
  await db.alcoholRules.updateMany({
    where: { shop, NOT: { validationId } },
    data: { validationId },
  });
}

/** What the cart block sees; a DB error reads as "no rules" so the storefront keeps working. */
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
  const row = await db.alcoholRules.findUnique({
    where: { shop },
    select: { enabled: true, localOnlyEnabled: true },
  });
  return Boolean(row?.enabled && row.localOnlyEnabled);
}
