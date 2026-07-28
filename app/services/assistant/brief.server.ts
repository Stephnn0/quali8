import type { PrismaClient } from "@prisma/client";
import {
  assistantBriefSchema,
  GEMINI_BRIEF_SCHEMA,
  type AssistantBrief,
} from "./briefSchema";
import { upcomingCoreDates } from "./coreDates";
import { buildFallbackBrief } from "./fallbackBriefs";
import { generateJson } from "./gemini.server";
import { nicheLabel } from "./taxonomy";

const BRIEF_MAX_AGE_DAYS = 7;

export type StoreFacts = {
  productCount: number;
  hasAudiences: boolean;
  hasPromotions: boolean;
  hasBundles: boolean;
  hasOccasions: boolean;
};

export type BriefRecord = {
  brief: AssistantBrief;
  source: "AI" | "FALLBACK";
  generatedAt: Date;
};

function buildPrompt(
  niche: string,
  label: string,
  country: string | null,
  note: string | null,
  facts: StoreFacts,
  now: Date,
): string {
  const coreDates = upcomingCoreDates(now, country ?? "US", 90)
    .map((core) => `- ${core.name}: ${core.date}`)
    .join("\n");

  return [
    `You are the merchandising assistant inside a Shopify app for a ${label} store` +
      (country ? ` in ${country}` : "") +
      `. Today is ${now.toISOString().slice(0, 10)}.`,
    note ? `The merchant adds: "${note}".` : "",
    `Store facts: ${facts.productCount} products; audiences configured: ${facts.hasAudiences}; shipping promotions configured: ${facts.hasPromotions}; product bundles configured: ${facts.hasBundles}; occasions curated: ${facts.hasOccasions}.`,
    "",
    "These upcoming commerce dates are VERIFIED — use them as ground truth, never change them:",
    coreDates,
    "",
    "Produce a JSON brief for the merchant's dashboard:",
    "- insight: 2–3 sentences on what matters for this niche right now. Plain, specific, no hype.",
    "- occasions: 4–6 upcoming dates that matter for THIS niche, ordered by date. Use the verified dates above where relevant; you may add niche-specific dates or seasons (as a representative yyyy-mm-dd within the next 90 days) only if you are confident they are real. whyItMatters: one sentence for this niche. suggestedAction: one concrete store task.",
    "- checklist: 5–7 readiness tasks mixing categories — store (their Shopify storefront), inventory, marketing, and app (this app's features: customer audiences, targeted shipping promotions, product bundles, occasion-based gift recommendations). Prefer app tasks for features the store facts show as not configured. id: kebab-case slug.",
    "Keep every string concise. No markdown, no emoji.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Validate + repair AI output; returns null when unusable. */
function sanitizeBrief(raw: unknown, now: Date): AssistantBrief | null {
  const parsed = assistantBriefSchema.safeParse(raw);
  if (!parsed.success) return null;

  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const end = start + 120 * 24 * 60 * 60 * 1000;

  const occasions = parsed.data.occasions
    .filter((occasion) => {
      const time = Date.parse(occasion.date + "T00:00:00Z");
      return Number.isFinite(time) && time >= start && time <= end;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (occasions.length === 0 || parsed.data.checklist.length === 0) return null;

  return { ...parsed.data, occasions };
}

/**
 * Returns the shop's assistant brief, generating (AI, falling back to
 * curated) when missing or stale. Never throws; the dashboard always gets
 * a brief.
 */
export async function getOrGenerateBrief(
  db: PrismaClient,
  shop: string,
  profile: { niche: string; nicheLabel: string; country: string | null; note: string | null },
  facts: StoreFacts,
  options: { force?: boolean; now?: Date } = {},
): Promise<BriefRecord> {
  const now = options.now ?? new Date();

  const existing = await db.dashboardBrief.findUnique({ where: { shop } });
  const fresh =
    existing &&
    existing.niche === profile.niche &&
    now.getTime() - existing.generatedAt.getTime() <
      BRIEF_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  if (existing && fresh && !options.force) {
    const parsed = assistantBriefSchema.safeParse(existing.payload);
    if (parsed.success) {
      return {
        brief: parsed.data,
        source: existing.source,
        generatedAt: existing.generatedAt,
      };
    }
  }

  // Generate: AI first, curated fallback otherwise
  let brief: AssistantBrief | null = null;
  let source: "AI" | "FALLBACK" = "AI";

  const raw = await generateJson(
    buildPrompt(
      profile.niche,
      profile.nicheLabel || nicheLabel(profile.niche),
      profile.country,
      profile.note,
      facts,
      now,
    ),
    GEMINI_BRIEF_SCHEMA as unknown as Record<string, unknown>,
  );
  brief = sanitizeBrief(raw, now);

  if (!brief) {
    brief = buildFallbackBrief(profile.niche, profile.country, now);
    source = "FALLBACK";
  }

  const saved = await db.dashboardBrief.upsert({
    where: { shop },
    create: {
      shop,
      niche: profile.niche,
      country: profile.country,
      source,
      payload: brief,
    },
    update: {
      niche: profile.niche,
      country: profile.country,
      source,
      payload: brief,
      generatedAt: now,
    },
  });

  return { brief, source, generatedAt: saved.generatedAt };
}
