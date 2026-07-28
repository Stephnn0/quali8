import type { PrismaClient } from "@prisma/client";
import type { BriefOccasion } from "./briefSchema";

/**
 * Upserts a brief's occasions into SpecialDate rows (source AI). Never
 * deletes anything — merchant-created dates and previously synced AI dates
 * (with their to-dos and action history) are left intact; re-synced dates
 * only refresh their copy.
 */
export async function syncSpecialDatesFromBrief(
  db: PrismaClient,
  shop: string,
  occasions: BriefOccasion[],
): Promise<void> {
  for (const occasion of occasions) {
    try {
      await db.specialDate.upsert({
        where: {
          shop_name_date: { shop, name: occasion.name, date: occasion.date },
        },
        create: {
          shop,
          name: occasion.name,
          date: occasion.date,
          whyItMatters: occasion.whyItMatters,
          source: "AI",
        },
        update: {
          whyItMatters: occasion.whyItMatters,
        },
      });
    } catch (error) {
      console.error("SpecialDate sync failed for", occasion.name, error);
    }
  }
}

/** Upcoming (and very recent) dates for the dashboard rail and index. */
export async function getUpcomingSpecialDates(
  db: PrismaClient,
  shop: string,
  now: Date = new Date(),
) {
  const today = now.toISOString().slice(0, 10);
  return db.specialDate.findMany({
    where: { shop, archived: false, date: { gte: today } },
    orderBy: { date: "asc" },
    include: {
      _count: { select: { todos: true } },
      todos: { select: { done: true } },
    },
  });
}
