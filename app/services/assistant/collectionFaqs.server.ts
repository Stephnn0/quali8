import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { generateJson } from "./gemini.server";
import { recordAiUsage } from "./usage.server";

const faqSchema = z.object({
  question: z.string().min(1).max(160),
  answer: z.string().min(1).max(600),
});

const suggestionsSchema = z.object({
  faqs: z.array(faqSchema).min(1).max(6),
});

const GEMINI_FAQ_SCHEMA = {
  type: "OBJECT",
  required: ["faqs"],
  properties: {
    faqs: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["question", "answer"],
        properties: {
          question: { type: "STRING", description: "max 160 characters" },
          answer: { type: "STRING", description: "2-3 sentences, max 600 characters" },
        },
      },
    },
  },
} as const;

export type FaqSuggestion = z.infer<typeof faqSchema>;

/**
 * One Gemini call producing ~5 SEO-friendly FAQs for a collection,
 * grounded in the store's niche. Returns null when the AI is unavailable —
 * the UI surfaces the failure rather than inserting canned questions.
 */
export async function generateFaqSuggestions(
  db: PrismaClient,
  shop: string,
  context: {
    collectionTitle: string;
    nicheLabel: string;
    country: string | null;
    existingQuestions: string[];
  },
): Promise<FaqSuggestion[] | null> {
  const prompt = [
    `You write SEO-friendly FAQ content for a ${context.nicheLabel} Shopify store` +
      (context.country ? ` in ${context.country}` : "") +
      ".",
    `Write 5 FAQs for the collection "${context.collectionTitle}", shown on the collection page and marked up as FAQPage structured data.`,
    "Questions: phrased how real shoppers search (delivery, care, sizing/selection, occasions, freshness/quality — whatever fits this collection and niche).",
    "Answers: 2-3 helpful factual sentences, plain language, no hype, no invented store policies (say \"contact us\" rather than inventing specifics like exact delivery times or prices).",
    context.existingQuestions.length
      ? `Do not repeat these existing questions: ${context.existingQuestions.join(" | ")}`
      : "",
    "No markdown, no emoji.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await generateJson(
    prompt,
    GEMINI_FAQ_SCHEMA as unknown as Record<string, unknown>,
  );
  await recordAiUsage(db, shop, "collection-faqs", result?.usage);

  const parsed = suggestionsSchema.safeParse(result?.data);
  return parsed.success ? parsed.data.faqs : null;
}
