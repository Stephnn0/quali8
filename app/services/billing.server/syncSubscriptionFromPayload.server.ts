import type { PrismaClient } from "@prisma/client";
import {
  mapSubscriptionPayload,
  type SubscriptionWebhookPayload,
} from "./subscriptionPayload";

/**
 * Persist an APP_SUBSCRIPTIONS_UPDATE event straight from its payload, for
 * the cases where the enriched sync through the Admin API is impossible:
 * the shop has no offline session yet, or its token expired and cannot be
 * refreshed. Writes the subscription row and the pricing row; the shop's
 * subscription metafield is left to the next enriched sync (setup, the
 * return from the pricing page, or the next webhook with a working token).
 *
 * Returns what was written, or the reason nothing was.
 */
export async function syncSubscriptionFromPayload(
  db: PrismaClient,
  shop: string,
  payload: unknown,
  processID: string,
): Promise<{ ok: true; plan: string; status: string } | { ok: false; reason: string }> {
  const mapped = mapSubscriptionPayload(payload as SubscriptionWebhookPayload);
  if (!mapped) return { ok: false, reason: "payload has no recurring pricing we recognise" };

  const store = await db.shopifyStore.findUnique({ where: { shop }, select: { shop: true } });
  if (!store) return { ok: false, reason: "no store row yet; setup will sync it" };

  const recurringPlan = await db.recurringPlan.findFirst({
    where: { level: mapped.planLevel, interval: mapped.pricing.interval },
    select: { id: true, name: true },
  });
  if (!recurringPlan) {
    return { ok: false, reason: `no seeded plan for ${mapped.planLevel} / ${mapped.pricing.interval}` };
  }

  const pricingWhere = {
    price: mapped.pricing.price,
    currencyCode: mapped.pricing.currencyCode,
    interval: mapped.pricing.interval,
    discount: null,
    discountType: null,
    discountPriceAfter: null,
    discountCurrencyCode: null,
    discountDurationIntervals: null,
    discountRemainingIntervals: null,
  };

  await db.$transaction(async (tx) => {
    const pricing =
      (await tx.shopifyRecurringPricing.findFirst({ where: pricingWhere, select: { id: true } })) ??
      (await tx.shopifyRecurringPricing.create({
        data: {
          price: mapped.pricing.price,
          currencyCode: mapped.pricing.currencyCode,
          interval: mapped.pricing.interval,
        },
        select: { id: true },
      }));

    if (mapped.status === "ACTIVE") {
      // One active subscription per shop: the placeholder Free row (or an
      // older paid one) gives way to this one.
      await tx.shopifySubscription.updateMany({
        where: { shop, status: "ACTIVE", NOT: { shopifyId: mapped.shopifyId } },
        data: { status: "CANCELLED", currentPeriodEnd: null, cancelMethod: "MANUAL" },
      });
    }

    const data = {
      name: mapped.name,
      status: mapped.status,
      startDate: mapped.startDate,
      currentPeriodEnd: mapped.currentPeriodEnd,
      trialDays: mapped.trialDays,
      test: mapped.test,
      cancelMethod: mapped.status === "CANCELLED" ? ("MANUAL" as const) : null,
      recurringPlanId: recurringPlan.id,
      shopifyRecurringPricingId: pricing.id,
    };

    await tx.shopifySubscription.upsert({
      where: { shop_shopifyId: { shop, shopifyId: mapped.shopifyId } },
      create: { ...data, shop, shopifyId: mapped.shopifyId },
      update: data,
    });
  });

  console.log(`${processID} - Subscription saved from webhook payload for ${shop}: ${recurringPlan.name} ${mapped.status}`); // eslint-disable-line no-console
  return { ok: true, plan: recurringPlan.name, status: mapped.status };
}
