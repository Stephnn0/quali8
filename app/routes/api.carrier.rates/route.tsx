import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import db from "app/db.server";
import { verifyCarrierRequest } from "app/services/carrier/hmac.server";
import { buildRates } from "app/services/carrier/rates";

/**
 * Carrier service callback. Shopify POSTs the cart's origin, destination,
 * items, and currency here whenever checkout needs shipping rates, and
 * expects `{ rates: [...] }` back within ~10 seconds. Prices come from the
 * shop's delivery zones (Announcements + Delivery Check) and the Delivery
 * Rates settings. Authenticated by Shopify's HMAC header over the raw body.
 */

const rateRequestSchema = z.object({
  rate: z.object({
    destination: z.object({
      postal_code: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
    }),
    currency: z.string().min(1),
  }),
});

const empty = () => Response.json({ rates: [] });

export const loader = async (_args: LoaderFunctionArgs) =>
  new Response("Method not allowed", { status: 405 });

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { valid, body } = await verifyCarrierRequest(request);
  if (!valid) return new Response("Unauthorized", { status: 401 });

  const shop = request.headers.get("x-shopify-shop-domain")?.replace(/\/$/, "");
  if (!shop) return empty();

  try {
    const parsed = rateRequestSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return empty();
    const postalCode = parsed.data.rate.destination.postal_code ?? "";
    if (!postalCode) return empty();

    const [config, zones] = await Promise.all([
      db.carrierRate.findUnique({
        where: { shop },
        select: { enabled: true, title: true, fallbackPrice: true },
      }),
      db.deliveryZone.findMany({
        where: { shop, active: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { name: true, zipCodes: true, price: true, message: true },
      }),
    ]);

    const rates = buildRates({
      postalCode,
      currency: parsed.data.rate.currency,
      config,
      zones,
    });
    return Response.json({ rates });
  } catch (error) {
    console.error("Error in /api/carrier/rates:", error); // eslint-disable-line no-console
    return empty();
  }
};
