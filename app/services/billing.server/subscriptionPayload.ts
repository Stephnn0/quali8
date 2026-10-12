/**
 * Pure mapping of an APP_SUBSCRIPTIONS_UPDATE webhook payload to the
 * subscription row the app stores. Used when the webhook cannot be
 * enriched through the Admin API (the shop has no session yet, or its
 * offline token expired and cannot be refreshed), so the plan still lands
 * in our database instead of being dropped.
 */

import { APP_PLANS } from "app/constants/plans";

export type SubscriptionWebhookPayload = {
  app_subscription: {
    admin_graphql_api_id: string;
    name: string;
    status: "ACTIVE" | "CANCELLED" | "DECLINED" | "EXPIRED" | "FROZEN" | "PENDING" | "ACCEPTED";
    admin_graphql_api_shop_id: string;
    created_at: string;
    updated_at: string;
    currency: string;
    capped_amount: string | null;
    /** Present on recurring subscriptions (API 2025-10+). */
    price?: string | null;
    interval?: string | null;
    plan_handle?: string | null;
  };
};

export type MappedSubscription = {
  shopifyId: string;
  name: string;
  status: SubscriptionWebhookPayload["app_subscription"]["status"];
  startDate: Date;
  /** Start plus one interval while active; null otherwise. */
  currentPeriodEnd: Date | null;
  planLevel: "FREE" | "BASIC" | "ADVANCE";
  trialDays: number | null;
  pricing: { price: number; currencyCode: string; interval: "ANNUAL" | "EVERY_30_DAYS" };
  /** The payload does not say; Shopify's enriched sync corrects it later. */
  test: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseInterval(value: string | null | undefined): MappedSubscription["pricing"]["interval"] | null {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "EVERY_30_DAYS") return "EVERY_30_DAYS";
  if (normalized === "ANNUAL") return "ANNUAL";
  return null;
}

function planFor(handle: string | null | undefined, name: string) {
  const plans = Object.values(APP_PLANS);
  return (
    plans.find((plan) => plan.shopifyPlanHandle === (handle ?? "").trim().toLowerCase()) ??
    plans.find((plan) => plan.name.toLowerCase() === name.trim().toLowerCase()) ??
    null
  );
}

export function mapSubscriptionPayload(payload: SubscriptionWebhookPayload): MappedSubscription | null {
  const sub = payload.app_subscription;
  const interval = parseInterval(sub.interval);
  const price = sub.price == null ? NaN : Number(sub.price);
  if (!interval || !Number.isFinite(price)) return null;

  const plan = planFor(sub.plan_handle, sub.name);
  if (!plan) return null;

  const startDate = new Date(sub.created_at);
  if (Number.isNaN(startDate.getTime())) return null;

  const periodDays = interval === "ANNUAL" ? 365 : 30;
  const currentPeriodEnd =
    sub.status === "ACTIVE" ? new Date(startDate.getTime() + periodDays * DAY_MS) : null;

  return {
    shopifyId: sub.admin_graphql_api_id,
    name: sub.name,
    status: sub.status,
    startDate,
    currentPeriodEnd,
    planLevel: plan.level,
    trialDays: plan.trialDays ?? null,
    pricing: { price, currencyCode: sub.currency, interval },
    test: false,
  };
}
