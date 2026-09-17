import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import db from "app/db.server";
import { verifyCarrierRequest } from "app/services/carrier/hmac.server";
import { buildRates, type ShippingRate } from "app/services/carrier/rates";
import { TIMED_PROPERTY, findWindow, windowLabel } from "app/services/delivery/timedDelivery";
import { loadTimeWindows } from "app/services/delivery/timedDelivery.server";
import { getShopPlan } from "app/services/subscriptions/shopPlan.server";

/**
 * Carrier service callback. Shopify POSTs the cart's origin, destination,
 * items, and currency here whenever checkout needs shipping rates, and
 * expects `{ rates: [...] }` back within ~10 seconds. Prices come from the
 * shop's delivery zones and the Delivery page's checkout rate settings.
 * Authenticated by Shopify's HMAC header over the raw body.
 *
 * Logging is deliberately loud (framed with "=" rules) so a request can be
 * traced end to end in the server logs: who asked, what they sent, what we
 * matched, and exactly what we returned.
 */

/* eslint-disable no-console */

const RULE = "=".repeat(78);

function logBlock(title: string, lines: Array<[string, unknown]>) {
  console.log(RULE);
  console.log(`[Quali8 carrier] ${title}`);
  console.log(RULE);
  for (const [label, value] of lines) {
    const text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    console.log(`${label}: ${text}`);
  }
  console.log(RULE);
}

const rateRequestSchema = z.object({
  rate: z.object({
    origin: z
      .object({
        postal_code: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
      })
      .partial()
      .optional(),
    destination: z.object({
      postal_code: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      province: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
    }),
    items: z
      .array(
        z.object({
          name: z.string().optional(),
          quantity: z.number().optional(),
          price: z.number().optional(),
          grams: z.number().optional(),
          /** Line item properties travel with the request; the cart block sets the timed window here. */
          properties: z.record(z.string(), z.unknown()).nullable().optional(),
        }),
      )
      .optional(),
    currency: z.string().min(1),
  }),
});

/** The timed window code the cart block stored on a line item, if any. */
function timedPropertyOf(items: Array<{ properties?: Record<string, unknown> | null }>): string | null {
  for (const item of items) {
    const value = item.properties?.[TIMED_PROPERTY];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function respond(shop: string, rates: ShippingRate[], reason: string, startedAt: number) {
  logBlock("RESPONSE → Shopify", [
    ["Shop", shop],
    ["Reason", reason],
    ["Rates returned", rates.length],
    ["Payload", { rates }],
    ["Duration", `${Date.now() - startedAt} ms`],
  ]);
  return Response.json({ rates });
}

export const loader = async (_args: LoaderFunctionArgs) =>
  new Response("Method not allowed", { status: 405 });

export const action = async ({ request }: ActionFunctionArgs) => {
  const startedAt = Date.now();
  const shop =
    request.headers.get("x-shopify-shop-domain")?.replace(/\/$/, "") ?? "(no shop header)";

  const { valid, body } = await verifyCarrierRequest(request);

  let parsedBody: unknown = body;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    /* logged raw below */
  }

  logBlock("REQUEST ← Shopify", [
    ["Time", new Date(startedAt).toISOString()],
    ["Shop", shop],
    ["Method", request.method],
    ["URL", request.url],
    ["HMAC header present", Boolean(request.headers.get("x-shopify-hmac-sha256"))],
    ["HMAC valid", valid],
    ["Content-Type", request.headers.get("content-type") ?? "(none)"],
    ["Body", parsedBody],
  ]);

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!valid) {
    logBlock("REJECTED", [["Shop", shop], ["Reason", "HMAC signature invalid"]]);
    return new Response("Unauthorized", { status: 401 });
  }
  if (shop.startsWith("(")) return respond(shop, [], "missing X-Shopify-Shop-Domain header", startedAt);

  try {
    const parsed = rateRequestSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return respond(shop, [], `body failed validation: ${parsed.error.issues[0]?.message ?? "unknown"}`, startedAt);
    }
    const { destination, currency, items } = parsed.data.rate;
    const postalCode = destination.postal_code ?? "";
    if (!postalCode) return respond(shop, [], "no destination postal code", startedAt);

    // Checkout rates are an Advance feature; a downgraded shop keeps its
    // settings but Shopify gets no rates from us.
    const plan = await getShopPlan(shop, db);
    if (!plan.hasShippingDiscounts) {
      return respond(shop, [], `the ${plan.name} plan does not include checkout rates`, startedAt);
    }

    const timedCode = timedPropertyOf(items ?? []);
    const [config, zones, timeWindows] = await Promise.all([
      db.carrierRate.findUnique({
        where: { shop },
        select: { enabled: true, title: true, fallbackPrice: true },
      }),
      db.deliveryZone.findMany({
        where: { shop, active: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { name: true, zipCodes: true, price: true, message: true },
      }),
      timedCode ? loadTimeWindows(db, shop) : Promise.resolve([]),
    ]);
    const window = findWindow(timeWindows, timedCode);
    const timeWindow = window ? { label: windowLabel(window), price: window.price } : null;

    logBlock("MATCHING", [
      ["Shop", shop],
      ["Destination", destination],
      ["Currency", currency],
      ["Items", (items ?? []).length],
      ["Checkout rate config", config ?? "(none saved — defaults apply: disabled)"],
      ["Active zones", zones.map((zone) => ({ name: zone.name, codes: zone.zipCodes.length, price: zone.price }))],
      ["Timed delivery", timedCode ? (timeWindow ?? `"${timedCode}" is not an active window — ignored`) : "(none picked)"],
    ]);

    const rates = buildRates({ postalCode, currency, config, zones, timeWindow });
    const reason = rates.length
      ? `matched: ${rates[0].service_name} at ${rates[0].total_price} ${currency} (cents)`
      : !config
        ? "no checkout rate saved for this shop"
        : !config.enabled
          ? "checkout rate is disabled"
          : "no zone matched and no fallback price";
    return respond(shop, rates, reason, startedAt);
  } catch (error) {
    console.error(`[Quali8 carrier] ERROR for ${shop}:`, error);
    return respond(shop, [], "unexpected error (see stack above)", startedAt);
  }
};
