import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { generateJson } from "./gemini.server";
import { recordAiUsage } from "./usage.server";

export const SEO_BATCH_LIMIT = 25;

const suggestionSchema = z.object({
  id: z.string().min(1),
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(1),
});

const suggestionsSchema = z.object({
  items: z.array(suggestionSchema),
});

const GEMINI_SEO_SCHEMA = {
  type: "OBJECT",
  required: ["items"],
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["id", "seoTitle", "seoDescription"],
        properties: {
          id: { type: "STRING" },
          seoTitle: { type: "STRING", description: "max 60 characters" },
          seoDescription: { type: "STRING", description: "max 160 characters" },
        },
      },
    },
  },
} as const;

export type SeoSuggestionInput = {
  id: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type SeoSuggestion = {
  id: string;
  seoTitle: string;
  seoDescription: string;
};

const clamp = (value: string, max: number) =>
  value.length <= max ? value : value.slice(0, max - 1).trimEnd() + "…";

/**
 * One batched Gemini call producing SEO titles/descriptions optimized for
 * a special date. Returns null when the AI is unavailable — SEO copy has
 * no acceptable canned fallback, so the UI surfaces the failure instead.
 */
export async function generateSeoSuggestions(
  db: PrismaClient,
  shop: string,
  context: { dateName: string; date: string; nicheLabel: string; country: string | null },
  items: SeoSuggestionInput[],
): Promise<SeoSuggestion[] | null> {
  const batch = items.slice(0, SEO_BATCH_LIMIT);
  if (batch.length === 0) return [];

  const prompt = [
    `You write SEO metadata for a ${context.nicheLabel} Shopify store` +
      (context.country ? ` in ${context.country}` : "") +
      `, optimizing for ${context.dateName} (${context.date}).`,
    "For each item below, write:",
    "- seoTitle: max 60 characters, item name first, then the occasion naturally. No brackets, no pipes, no ALL CAPS, no keyword stuffing.",
    "- seoDescription: max 160 characters, one enticing factual sentence that mentions the occasion and invites the click.",
    "Return every input id exactly once.",
    "",
    "Items:",
    ...batch.map(
      (item) =>
        `- id: ${item.id} | name: ${item.title}` +
        (item.seoTitle ? ` | current title: ${item.seoTitle}` : "") +
        (item.seoDescription ? ` | current description: ${item.seoDescription}` : ""),
    ),
  ].join("\n");

  const result = await generateJson(
    prompt,
    GEMINI_SEO_SCHEMA as unknown as Record<string, unknown>,
    30_000,
  );
  await recordAiUsage(db, shop, "seo-meta", result?.usage);

  const parsed = suggestionsSchema.safeParse(result?.data);
  if (!parsed.success) return null;

  const wanted = new Set(batch.map((item) => item.id));
  return parsed.data.items
    .filter((item) => wanted.has(item.id))
    .map((item) => ({
      id: item.id,
      seoTitle: clamp(item.seoTitle.trim(), 60),
      seoDescription: clamp(item.seoDescription.trim(), 160),
    }));
}
