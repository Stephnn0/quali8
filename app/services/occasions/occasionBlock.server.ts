import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { occasionWindowContains } from "app/services/recommendations/constants";
import {
  MAX_GIFTS,
  MAX_SUGGESTED,
  MAX_TEXT,
  defaultOccasionBlockSettings,
  sanitizeOccasionBlockSettings,
  suggestOccasions,
  type OccasionBlockSettings,
  type StorefrontOccasion,
} from "./occasionBlock";

const text = z.string().max(MAX_TEXT);

export const occasionBlockActionSchema = z.object({
  action: z.literal("save-block-settings"),
  heading: text,
  subheading: text,
  suggestedCount: z.number().int().min(1).max(MAX_SUGGESTED),
  otherLabel: text,
  pickerTitle: text,
  giftsHeading: text,
  giftsSubtext: text,
  changeLabel: text,
  pairWithProduct: z.boolean(),
  addLabel: text,
  addingLabel: text,
  addedLabel: text,
  afterAdd: z.enum(["stay", "cart"]),
  giftLimit: z.number().int().min(1).max(MAX_GIFTS),
  showNowBadge: z.boolean(),
  nowLabel: text,
  emptyText: text,
  rememberChoice: z.boolean(),
});

export type OccasionBlockActionBody = z.infer<typeof occasionBlockActionSchema>;

export async function loadOccasionBlockSettings(db: PrismaClient, shop: string): Promise<OccasionBlockSettings> {
  const row = await db.occasionBlockSettings.findUnique({ where: { shop } });
  return row ? sanitizeOccasionBlockSettings(row as Partial<OccasionBlockSettings>) : defaultOccasionBlockSettings();
}

export async function saveOccasionBlockSettings(
  db: PrismaClient,
  shop: string,
  body: OccasionBlockActionBody,
): Promise<{ code: string; errors: Array<{ message: string }> | null }> {
  const data = sanitizeOccasionBlockSettings(body);
  await db.occasionBlockSettings.upsert({ where: { shop }, create: { ...data, shop }, update: data });
  return { code: "block-settings-saved", errors: null };
}

/** Everything the product-page block needs to draw its first stage. */
export type StorefrontOccasionBlock = {
  enabled: boolean;
  settings: OccasionBlockSettings;
  occasions: StorefrontOccasion[];
  /** Slugs to show as chips before "Other occasions". */
  suggested: string[];
};

export const disabledOccasionBlock = (): StorefrontOccasionBlock => ({
  enabled: false,
  settings: defaultOccasionBlockSettings(),
  occasions: [],
  suggested: [],
});

export async function loadStorefrontOccasionBlock(
  db: PrismaClient,
  shop: string,
  now: Date = new Date(),
): Promise<StorefrontOccasionBlock> {
  const [settings, rows] = await Promise.all([
    loadOccasionBlockSettings(db, shop),
    db.occasion.findMany({
      where: { shop, status: "ACTIVE" },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { slug: true, name: true, icon: true, startMonth: true, startDay: true, endMonth: true, endDay: true },
    }),
  ]);
  const occasions = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    icon: row.icon?.trim() || null,
    inSeason: occasionWindowContains(row, now),
  }));
  return {
    enabled: occasions.length > 0,
    settings,
    occasions,
    suggested: suggestOccasions(occasions, settings.suggestedCount).map((o) => o.slug),
  };
}
