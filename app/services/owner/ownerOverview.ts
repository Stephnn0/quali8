/**
 * Pure helpers for the owner-only overview (`/app/owner`): which shops run
 * the app, on which plan, who is in trial, who uninstalled, and how to
 * reach them. The server loader feeds database rows in; the route renders
 * the classified rows and the summary.
 */

import { APP } from "app/constants/app.constants";

/** True when `shop` is one of the app owner's own stores. */
export function isOwnerShop(shop: string | null | undefined): boolean {
  if (!shop) return false;
  const needle = shop.trim().toLowerCase();
  return APP.OWNER_SHOPS.some((owner) => owner.toLowerCase() === needle);
}

export type OwnerSubscriptionInput = {
  name: string;
  status: "ACTIVE" | "CANCELLED" | "DECLINED" | "EXPIRED" | "FROZEN" | "PENDING" | "ACCEPTED";
  test: boolean;
  trialDays: number | null;
  startDate: Date;
  currentPeriodEnd: Date | null;
  updatedAt: Date;
  cancelMethod: "UNINSTALL" | "MANUAL" | null;
  recurringPlan: {
    name: string;
    level: "FREE" | "BASIC" | "ADVANCE";
    price: number;
  } | null;
  shopifyRecurringPricing: {
    price: number;
    discountPriceAfter: number | null;
    interval: "ANNUAL" | "EVERY_30_DAYS";
  } | null;
};

export type OwnerSessionInput = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  accountOwner: boolean;
};

export type OwnerStoreInput = {
  shop: string;
  status: "INSTALLED" | "SETUP" | "UNINSTALLED";
  appVersion: string;
  createdAt: Date;
  updatedAt: Date;
  shopData: {
    name: string | null;
    email: string | null;
    shopOwnerName: string | null;
    country: string | null;
    currency: string | null;
    planDisplayName: string | null;
    primaryLocale: string | null;
  } | null;
  sessions: OwnerSessionInput[];
  subscriptions: OwnerSubscriptionInput[];
};

export type OwnerPlanLabel = "Free" | "Advance" | "Pro (legacy)";

/** One bucket per store: the first that applies, top to bottom. */
export type OwnerStoreState = "uninstalled" | "trial" | "paid" | "free";

export type OwnerStoreRow = {
  shop: string;
  storeName: string;
  contactName: string | null;
  contactEmail: string | null;
  country: string | null;
  currency: string | null;
  shopifyPlan: string | null;
  appVersion: string;
  installed: boolean;
  installedAt: Date;
  lastActivityAt: Date;
  daysInstalled: number;
  plan: OwnerPlanLabel;
  state: OwnerStoreState;
  test: boolean;
  /** When the running trial ends, or when a finished one ended. */
  trialEndsAt: Date | null;
  trialDaysLeft: number | null;
  currentPeriodEnd: Date | null;
  /** What the shop pays per 30 days (0 for Free and test subscriptions). */
  monthlyPrice: number;
  /** The most relevant subscription row: the active one, else the newest. */
  lastSubscription: {
    name: string;
    status: OwnerSubscriptionInput["status"];
    cancelMethod: OwnerSubscriptionInput["cancelMethod"];
  } | null;
};

export type OwnerSummary = {
  total: number;
  installed: number;
  uninstalled: number;
  free: number;
  advance: number;
  trial: number;
  paying: number;
  test: number;
  /** Sum of `monthlyPrice` over installed, non-test paying shops. */
  monthlyRevenue: number;
};

export type OwnerFilter = "all" | "advance" | "free" | "trial" | "uninstalled" | "test";

export const OWNER_FILTERS: { id: OwnerFilter; label: string }[] = [
  { id: "all", label: "All stores" },
  { id: "advance", label: "Advance" },
  { id: "trial", label: "In trial" },
  { id: "free", label: "Free" },
  { id: "uninstalled", label: "Uninstalled" },
  { id: "test", label: "Test charges" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function planLabel(sub: OwnerSubscriptionInput | null): OwnerPlanLabel {
  const level = sub?.recurringPlan?.level;
  if (level === "ADVANCE") return "Advance";
  if (level === "BASIC") return "Pro (legacy)";
  return "Free";
}

function pickSubscription(subs: OwnerSubscriptionInput[]) {
  const byNewest = [...subs].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
  const active = byNewest.find((sub) => sub.status === "ACTIVE") ?? null;
  return { active, latest: active ?? byNewest[0] ?? null };
}

function monthlyPriceOf(sub: OwnerSubscriptionInput | null): number {
  if (!sub || sub.test) return 0;
  const pricing = sub.shopifyRecurringPricing;
  const price = pricing?.discountPriceAfter ?? pricing?.price ?? sub.recurringPlan?.price ?? 0;
  if (!price) return 0;
  return pricing?.interval === "ANNUAL" ? Math.round((price / 12) * 100) / 100 : price;
}

function fullName(first: string | null, last: string | null): string | null {
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || null;
}

/** Turns one store's rows into the row the owner table shows. */
export function classifyStore(store: OwnerStoreInput, now: Date): OwnerStoreRow {
  const installed = store.status !== "UNINSTALLED";
  const { active, latest } = pickSubscription(store.subscriptions);
  const plan = installed ? planLabel(active) : "Free";

  let trialEndsAt: Date | null = null;
  let trialDaysLeft: number | null = null;
  if (active?.trialDays && active.trialDays > 0 && plan !== "Free") {
    trialEndsAt = new Date(active.startDate.getTime() + active.trialDays * DAY_MS);
    trialDaysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));
  }

  let state: OwnerStoreState = "free";
  if (!installed) state = "uninstalled";
  else if (plan !== "Free" && trialEndsAt && trialEndsAt.getTime() > now.getTime()) state = "trial";
  else if (plan !== "Free") state = "paid";

  const ownerSession =
    store.sessions.find((session) => session.accountOwner) ?? store.sessions[0] ?? null;

  return {
    shop: store.shop,
    storeName: store.shopData?.name || store.shop.replace(".myshopify.com", ""),
    contactName:
      fullName(ownerSession?.firstName ?? null, ownerSession?.lastName ?? null) ??
      store.shopData?.shopOwnerName ??
      null,
    contactEmail: ownerSession?.email ?? store.shopData?.email ?? null,
    country: store.shopData?.country ?? null,
    currency: store.shopData?.currency ?? null,
    shopifyPlan: store.shopData?.planDisplayName ?? null,
    appVersion: store.appVersion,
    installed,
    installedAt: store.createdAt,
    lastActivityAt: store.updatedAt,
    daysInstalled: Math.max(0, Math.floor((now.getTime() - store.createdAt.getTime()) / DAY_MS)),
    plan,
    state,
    test: active?.test ?? false,
    trialEndsAt,
    trialDaysLeft,
    currentPeriodEnd: active?.currentPeriodEnd ?? null,
    monthlyPrice: installed && state !== "free" ? monthlyPriceOf(active) : 0,
    lastSubscription: latest
      ? { name: latest.name, status: latest.status, cancelMethod: latest.cancelMethod }
      : null,
  };
}

export function summarizeStores(rows: OwnerStoreRow[]): OwnerSummary {
  const summary: OwnerSummary = {
    total: rows.length,
    installed: 0,
    uninstalled: 0,
    free: 0,
    advance: 0,
    trial: 0,
    paying: 0,
    test: 0,
    monthlyRevenue: 0,
  };
  for (const row of rows) {
    if (row.installed) summary.installed += 1;
    else summary.uninstalled += 1;
    if (row.state === "free") summary.free += 1;
    if (row.installed && row.plan !== "Free") summary.advance += 1;
    if (row.state === "trial") summary.trial += 1;
    if (row.state === "paid") summary.paying += 1;
    if (row.test) summary.test += 1;
    if (row.state === "paid") summary.monthlyRevenue += row.monthlyPrice;
  }
  summary.monthlyRevenue = Math.round(summary.monthlyRevenue * 100) / 100;
  return summary;
}

function matchesFilter(row: OwnerStoreRow, filter: OwnerFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "advance":
      return row.installed && row.plan !== "Free";
    case "free":
      return row.state === "free";
    case "trial":
      return row.state === "trial";
    case "uninstalled":
      return !row.installed;
    case "test":
      return row.test;
  }
}

/** Rows in `filter` whose shop, name, or contact contains `query`. */
export function filterStores(
  rows: OwnerStoreRow[],
  filter: OwnerFilter,
  query: string,
): OwnerStoreRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (!matchesFilter(row, filter)) return false;
    if (!needle) return true;
    return [row.shop, row.storeName, row.contactName, row.contactEmail]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(needle));
  });
}
