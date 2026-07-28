import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { generateJson } from "./gemini.server";
import { recordAiUsage } from "./usage.server";

const todoSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(220),
});

const suggestionsSchema = z.object({
  seo: z.array(todoSchema).max(6),
  marketing: z.array(todoSchema).max(6),
});

const GEMINI_TODOS_SCHEMA = {
  type: "OBJECT",
  required: ["seo", "marketing"],
  properties: {
    seo: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["title", "description"],
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
        },
      },
    },
    marketing: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["title", "description"],
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
        },
      },
    },
  },
} as const;

const FALLBACK = {
  seo: [
    {
      title: "Optimize titles and meta descriptions",
      description:
        "Use the SEO tool below to rewrite product and collection metadata around this date's search terms.",
    },
    {
      title: "Create a landing collection",
      description:
        "A dedicated collection page gives search engines a page to rank for this occasion.",
    },
    {
      title: "Add the occasion to key product descriptions",
      description:
        "Mention the occasion naturally in your bestsellers' descriptions so they surface in seasonal searches.",
    },
    {
      title: "Check your page speed",
      description:
        "Compress hero images before traffic peaks — slow pages lose seasonal shoppers.",
    },
  ],
  marketing: [
    {
      title: "Plan an email announcement",
      description:
        "Tell your list what you're offering for this date and when to order by.",
    },
    {
      title: "Schedule social posts",
      description:
        "Two or three posts leading up to the date, starting about two weeks out.",
    },
    {
      title: "Set up a targeted promotion",
      description:
        "A shipping discount or bundle for this date converts warm traffic at checkout.",
    },
    {
      title: "Publish order-by deadlines",
      description:
        "Make the last order date visible on your homepage and product pages.",
    },
  ],
};

/**
 * Generates the AI starter to-do set for a special date (lazy — called on
 * first open of the manage page). Falls back to curated tasks; records
 * token usage; stamps todosGeneratedAt so deletion by the merchant is
 * respected.
 */
export async function generateDateTodos(
  db: PrismaClient,
  shop: string,
  specialDate: {
    id: number;
    name: string;
    date: string;
    whyItMatters: string | null;
  },
  profile: { nicheLabel: string; country: string | null },
): Promise<void> {
  const prompt = [
    `You are the merchandising assistant for a ${profile.nicheLabel} Shopify store` +
      (profile.country ? ` in ${profile.country}` : "") +
      ".",
    `The merchant is preparing for: ${specialDate.name} on ${specialDate.date}.`,
    specialDate.whyItMatters ? `Context: ${specialDate.whyItMatters}` : "",
    "",
    "Produce two focused to-do lists to get this store ready for the date:",
    "- seo: exactly 4 tasks about search visibility (metadata, collections, content, technical basics).",
    "- marketing: exactly 4 tasks about promotion (email, social, offers, deadlines).",
    "Each task: a short imperative title and one concrete sentence of description specific to this niche and date. No markdown, no emoji.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await generateJson(
    prompt,
    GEMINI_TODOS_SCHEMA as unknown as Record<string, unknown>,
  );
  await recordAiUsage(db, shop, "date-todos", result?.usage);

  const parsed = suggestionsSchema.safeParse(result?.data);
  const suggestions = parsed.success ? parsed.data : FALLBACK;

  const rows = [
    ...suggestions.seo.map((todo, index) => ({
      ...todo,
      kind: "SEO" as const,
      position: index,
    })),
    ...suggestions.marketing.map((todo, index) => ({
      ...todo,
      kind: "MARKETING" as const,
      position: index,
    })),
  ];

  await db.$transaction([
    db.specialDateTodo.createMany({
      data: rows.map((row) => ({
        shop,
        specialDateId: specialDate.id,
        title: row.title,
        description: row.description,
        kind: row.kind,
        source: "AI",
        position: row.position,
      })),
    }),
    db.specialDate.update({
      where: { id: specialDate.id },
      data: { todosGeneratedAt: new Date() },
    }),
  ]);
}
