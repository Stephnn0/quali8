import type { PrismaClient } from "@prisma/client";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { subscribeCustomer } from "app/models/shopify.server/customers";
import { shopNow } from "app/services/delivery/shopTime";
import { loadShopTimezone } from "app/services/delivery/deliverySchedule.server";
import { getShopPlan } from "app/services/subscriptions/shopPlan.server";
import { limitReached, monthStartUtc } from "app/services/subscriptions/planLimits";
import {
  customerAdminId,
  summarizeDailyStats,
  type SubscribeSummary,
} from "./subscribeAnalytics";

export type PopupEvent = "view" | "dismiss" | "subscribe";

/** Today's date key in the shop's timezone (UTC when it was never synced). */
async function shopDay(db: PrismaClient, shop: string): Promise<string> {
  return shopNow(await loadShopTimezone(db, shop)).date;
}

/** Bumps today's counter for the event. Never throws: analytics are best-effort. */
export async function recordPopupEvent(
  db: PrismaClient,
  shop: string,
  event: PopupEvent,
): Promise<void> {
  const column = event === "view" ? "views" : event === "dismiss" ? "dismissals" : "subscribes";
  try {
    const day = await shopDay(db, shop);
    await db.popupDailyStat.upsert({
      where: { shop_day: { shop, day } },
      create: { shop, day, [column]: 1 },
      update: { [column]: { increment: 1 } },
    });
  } catch (error) {
    console.error("Popup event not recorded:", error); // eslint-disable-line no-console
  }
}

export type SignupLimitStatus = {
  /** Signups the plan allows per calendar month; null = unlimited. */
  limit: number | null;
  /** New subscribers recorded since the first of the month (UTC). */
  used: number;
  reached: boolean;
  planName: string;
};

/** Where the shop stands against its plan's monthly popup signup cap. */
export async function signupLimitStatus(
  db: PrismaClient,
  shop: string,
  now: Date = new Date(),
): Promise<SignupLimitStatus> {
  const plan = await getShopPlan(shop, db);
  if (plan.popupSignupLimit === null) {
    return { limit: null, used: 0, reached: false, planName: plan.name };
  }
  const used = await db.popupSubscriber.count({
    where: { shop, createdAt: { gte: monthStartUtc(now) } },
  });
  return {
    limit: plan.popupSignupLimit,
    used,
    reached: limitReached(plan.popupSignupLimit, used),
    planName: plan.name,
  };
}

export type SubscribeFromPopupInput = {
  db: PrismaClient;
  /** Null when the app has no offline session for the shop. */
  graphql: AdminGraphqlClient | null;
  shop: string;
  email: string;
  firstName: string | null;
  tags: string[];
};

export type SubscribeFromPopupResult = {
  /** The signup was recorded (always true unless the database failed). */
  ok: boolean;
  /** The shopper now exists in Shopify customers with marketing consent. */
  savedInShopify: boolean;
  /** The app lacks `write_customers`; the storefront falls back to /contact. */
  scopeMissing: boolean;
  /** The plan's monthly signup cap is used up; the storefront must not fall back. */
  limitReached?: boolean;
};

/**
 * Saves a popup signup: the shopper becomes (or is updated as) a Shopify
 * customer, and the outcome is recorded in `PopupSubscriber` plus today's
 * counters so the feature page can show who subscribed.
 */
export async function subscribeFromPopup(
  input: SubscribeFromPopupInput,
): Promise<SubscribeFromPopupResult> {
  const { db, graphql, shop, email, firstName, tags } = input;

  // `proxy.popup` stops showing the popup once the cap is reached; this
  // guards the window between that and a popup already open in a tab.
  const cap = await signupLimitStatus(db, shop);
  if (cap.reached) {
    return { ok: false, savedInShopify: false, scopeMissing: false, limitReached: true };
  }

  const shopifyResult = graphql
    ? await subscribeCustomer(graphql, { email, firstName: firstName ?? undefined, tags })
    : ({ state: "error", message: "The app has no offline session for this shop" } as const);

  const saved = shopifyResult.state === "created" || shopifyResult.state === "updated";
  const scopeMissing = shopifyResult.state === "scope-missing";
  if (!saved) {
    console.error("Popup subscriber not saved in Shopify:", shop, email, shopifyResult.message); // eslint-disable-line no-console
  }

  const popup = await db.subscribePopup.findFirst({
    where: { shop, specialDateId: null },
    select: { discountCode: true },
  });
  const discountCode = popup?.discountCode ?? "";
  const now = new Date();

  const record = {
    customerId: saved ? shopifyResult.customerId : undefined,
    result: shopifyResult.state === "created"
      ? ("CREATED" as const)
      : shopifyResult.state === "updated"
        ? ("UPDATED" as const)
        : ("FAILED" as const),
    lastError: saved ? null : shopifyResult.message.slice(0, 500),
    tags: tags.join(","),
    firstName: firstName ?? undefined,
    lastSubscribedAt: now,
  };

  try {
    await db.popupSubscriber.upsert({
      where: { shop_email: { shop, email } },
      create: { shop, email, discountCode, ...record, firstName: firstName },
      update: {
        ...record,
        discountCode: discountCode || undefined,
        subscribeCount: { increment: 1 },
      },
    });
  } catch (error) {
    console.error("Popup subscriber not recorded:", error); // eslint-disable-line no-console
    return { ok: false, savedInShopify: saved, scopeMissing };
  }

  await recordPopupEvent(db, shop, "subscribe");
  return { ok: true, savedInShopify: saved, scopeMissing };
}

export type SubscriberRow = {
  id: number;
  email: string;
  firstName: string | null;
  /** Numeric Shopify customer id for the admin link, when saved. */
  customerAdminId: string | null;
  result: "CREATED" | "UPDATED" | "FAILED";
  lastError: string | null;
  discountCode: string;
  subscribeCount: number;
  createdAt: string;
  lastSubscribedAt: string;
};

export type SubscribeAnalytics = {
  totalSubscribers: number;
  /** Subscribers whose Shopify save failed (they still appear in the list). */
  failedSubscribers: number;
  last30: SubscribeSummary;
  today: string;
  recent: SubscriberRow[];
  /** Whether the app has been granted `write_customers`. */
  canWriteCustomers: boolean;
};

export const RECENT_SUBSCRIBERS = 50;

/** Everything the Subscribers card on the feature page shows. */
export async function loadSubscribeAnalytics(
  db: PrismaClient,
  shop: string,
  grantedScopes: string | null | undefined,
): Promise<SubscribeAnalytics> {
  const today = await shopDay(db, shop);
  const [totalSubscribers, failedSubscribers, stats, recent] = await Promise.all([
    db.popupSubscriber.count({ where: { shop } }),
    db.popupSubscriber.count({ where: { shop, result: "FAILED" } }),
    db.popupDailyStat.findMany({
      where: { shop },
      orderBy: { day: "desc" },
      take: 31,
    }),
    db.popupSubscriber.findMany({
      where: { shop },
      orderBy: { lastSubscribedAt: "desc" },
      take: RECENT_SUBSCRIBERS,
    }),
  ]);

  return {
    totalSubscribers,
    failedSubscribers,
    last30: summarizeDailyStats(stats, today, 30),
    today,
    recent: recent.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      customerAdminId: customerAdminId(row.customerId),
      result: row.result,
      lastError: row.lastError,
      discountCode: row.discountCode,
      subscribeCount: row.subscribeCount,
      createdAt: row.createdAt.toISOString(),
      lastSubscribedAt: row.lastSubscribedAt.toISOString(),
    })),
    canWriteCustomers: (grantedScopes ?? "")
      .split(",")
      .map((scope) => scope.trim())
      .includes("write_customers"),
  };
}
