import { z } from "zod";

/**
 * The assistant brief contract: what the dashboard renders, what Gemini
 * must produce, and what the curated fallbacks hand-author. Client-safe.
 */

export const briefOccasionSchema = z.object({
  name: z.string().min(1).max(60),
  /** ISO yyyy-mm-dd */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  whyItMatters: z.string().min(1).max(200),
  suggestedAction: z.string().min(1).max(160),
});

export const briefChecklistItemSchema = z.object({
  id: z.string().min(1).max(60),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(220),
  category: z.enum(["store", "inventory", "marketing", "app"]),
});

export const assistantBriefSchema = z.object({
  insight: z.string().min(1).max(600),
  occasions: z.array(briefOccasionSchema).max(8),
  checklist: z.array(briefChecklistItemSchema).max(8),
});

export type BriefOccasion = z.infer<typeof briefOccasionSchema>;
export type BriefChecklistItem = z.infer<typeof briefChecklistItemSchema>;
export type AssistantBrief = z.infer<typeof assistantBriefSchema>;

/** The same contract expressed as a Gemini responseSchema. */
export const GEMINI_BRIEF_SCHEMA = {
  type: "OBJECT",
  required: ["insight", "occasions", "checklist"],
  properties: {
    insight: { type: "STRING" },
    occasions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["name", "date", "whyItMatters", "suggestedAction"],
        properties: {
          name: { type: "STRING" },
          date: { type: "STRING", description: "ISO date yyyy-mm-dd" },
          whyItMatters: { type: "STRING" },
          suggestedAction: { type: "STRING" },
        },
      },
    },
    checklist: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["id", "title", "description", "category"],
        properties: {
          id: { type: "STRING", description: "kebab-case slug" },
          title: { type: "STRING" },
          description: { type: "STRING" },
          category: {
            type: "STRING",
            enum: ["store", "inventory", "marketing", "app"],
          },
        },
      },
    },
  },
} as const;
