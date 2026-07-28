import type { PrismaClient } from "@prisma/client";
import { GEMINI_MODEL, type GeminiUsage } from "./gemini.server";

export type AiFeature =
  | "brief"
  | "niche-inference"
  | "date-todos"
  | "seo-meta";

/**
 * Records one Gemini call's token usage for a shop. Fire-and-forget:
 * accounting must never break the feature that triggered it.
 */
export async function recordAiUsage(
  db: PrismaClient,
  shop: string,
  feature: AiFeature,
  usage: GeminiUsage | null | undefined,
): Promise<void> {
  if (!usage) return;
  try {
    await db.aiUsage.create({
      data: {
        shop,
        feature,
        model: GEMINI_MODEL,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      },
    });
  } catch (error) {
    console.error("Failed to record AI usage:", error);
  }
}
