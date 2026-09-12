import type { Prisma, PrismaClient } from "@prisma/client";
import type { SeasonalFeatureKey } from "app/components/Seasonal/seasonalFeatures";
import type { SpecialDateSummary } from "app/components/Seasonal/types";
import { windowLabel } from "app/components/Seasonal/dates";

export type FeatureDateRow = SpecialDateSummary & {
  /** One-line state of this feature on this date, e.g. "Scheduled 11-24 → 11-30". */
  status: string;
  /** True when the feature is live / scheduled / complete on this date. */
  active: boolean;
  /** False when nothing has been configured for this date yet. */
  configured: boolean;
};

type Scheduled = { enabled: boolean; startDate: string; endDate: string } | null;

const scheduledStatus = (config: Scheduled) =>
  config
    ? config.enabled
      ? { status: `Scheduled ${windowLabel(config.startDate, config.endDate)}`, active: true }
      : { status: "Paused", active: false }
    : { status: "Not set up", active: false };

const todoStatus = (
  todos: Array<{ done: boolean }>,
  generated: boolean,
) => {
  if (!generated && todos.length === 0) {
    return { status: "Not started", active: false, configured: false };
  }
  const done = todos.filter((todo) => todo.done).length;
  return {
    status: `${done} of ${todos.length} done`,
    active: todos.length > 0 && done === todos.length,
    configured: true,
  };
};

const include = {
  announcementBar: { select: { enabled: true, startDate: true, endDate: true } },
  scheduledHero: { select: { enabled: true, startDate: true, endDate: true } },
  subscribePopup: { select: { enabled: true, startDate: true, endDate: true } },
  scheduledMenuItem: {
    select: {
      enabled: true,
      startDate: true,
      endDate: true,
      appliedMenuItemId: true,
    },
  },
  todos: { select: { kind: true, done: true } },
  _count: { select: { seoActions: true } },
} satisfies Prisma.SpecialDateInclude;

type DateRow = Prisma.SpecialDateGetPayload<{ include: typeof include }>;
type FeatureState = Pick<FeatureDateRow, "status" | "active" | "configured">;

const FEATURE_STATE: Record<SeasonalFeatureKey, (entry: DateRow) => FeatureState> = {
  "smart-announcements": (entry) => ({
    ...scheduledStatus(entry.announcementBar),
    configured: entry.announcementBar !== null,
  }),
  "seasonal-hero": (entry) => ({
    ...scheduledStatus(entry.scheduledHero),
    configured: entry.scheduledHero !== null,
  }),
  "subscribe-boost": (entry) => ({
    ...scheduledStatus(entry.subscribePopup),
    configured: entry.subscribePopup !== null,
  }),
  "smart-menu": (entry) => {
    const item = entry.scheduledMenuItem;
    if (item?.appliedMenuItemId) {
      return { status: "Live in menu", active: true, configured: true };
    }
    return { ...scheduledStatus(item), configured: item !== null };
  },
  "seo-ai": (entry) => {
    const count = entry._count.seoActions;
    return {
      status: count ? `${count} applied` : "Not started",
      active: count > 0,
      configured: count > 0,
    };
  },
  "seo-prep-list": (entry) =>
    todoStatus(
      entry.todos.filter((todo) => todo.kind === "SEO"),
      entry.todosGeneratedAt !== null,
    ),
  "marketing-playbook": (entry) =>
    todoStatus(
      entry.todos.filter((todo) => todo.kind !== "SEO"),
      entry.todosGeneratedAt !== null,
    ),
};

/**
 * Upcoming special dates with the state of one seasonal feature on each,
 * for that feature's list page. Loads only what the feature needs to show
 * a status; the per-date page loads the full detail.
 */
export async function loadFeatureDates(
  db: PrismaClient,
  shop: string,
  feature: SeasonalFeatureKey,
  now: Date = new Date(),
): Promise<FeatureDateRow[]> {
  const today = now.toISOString().slice(0, 10);
  const dates = await db.specialDate.findMany({
    where: { shop, archived: false, date: { gte: today } },
    orderBy: { date: "asc" },
    include,
  });

  return dates.map((entry) => ({
    id: entry.id,
    name: entry.name,
    date: entry.date,
    whyItMatters: entry.whyItMatters,
    source: entry.source,
    ...FEATURE_STATE[feature](entry),
  }));
}
