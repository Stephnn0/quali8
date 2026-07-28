import type { PrismaClient } from "@prisma/client";
import { generateJson } from "./gemini.server";
import { classifyByKeywords, isNicheSlug, NICHES, type NicheSlug } from "./taxonomy";
import { recordAiUsage } from "./usage.server";

const GEMINI_NICHE_SCHEMA = {
  type: "OBJECT",
  required: ["slug"],
  properties: {
    slug: {
      type: "STRING",
      enum: NICHES.map((niche) => niche.slug),
    },
  },
} as const;

/**
 * Classifies a store into the niche taxonomy from a catalog sample.
 * Gemini when available, deterministic keywords otherwise. Never throws.
 */
export async function inferNiche(
  catalogText: string,
  tracking?: { db: PrismaClient; shop: string },
): Promise<NicheSlug> {
  if (!catalogText.trim()) return "other";

  const result = await generateJson(
    [
      "Classify this Shopify store into exactly one niche slug from the enum.",
      "Choose the closest match; use \"other\" only when nothing fits.",
      "Store catalog sample (product titles, types, tags):",
      catalogText,
    ].join("\n"),
    GEMINI_NICHE_SCHEMA as unknown as Record<string, unknown>,
    10_000,
  );
  if (tracking) {
    await recordAiUsage(tracking.db, tracking.shop, "niche-inference", result?.usage);
  }

  const slug = (result?.data as { slug?: string } | null)?.slug;
  if (slug && isNicheSlug(slug)) return slug;

  return classifyByKeywords(catalogText);
}
