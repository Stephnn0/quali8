/**
 * Pure rate building for the carrier service callback. No server imports —
 * unit tested. Shopify expects prices in cents as strings.
 */
import { matchZone } from "app/services/delivery/deliveryZones";

export const SERVICE_CODE = "quali8-delivery";

export type ShippingRate = {
  service_name: string;
  service_code: string;
  total_price: string;
  currency: string;
  description?: string;
  min_delivery_date: string;
  max_delivery_date: string;
};

export type RateZone = {
  name: string;
  zipCodes: string[];
  price: number | null;
  message: string | null;
};

export type RateConfig = {
  enabled: boolean;
  title: string;
  fallbackPrice: number | null;
};

export const toCents = (amount: number): string =>
  String(Math.round(amount * 100));

/**
 * The rates to return for a destination postal code: the matching zone's
 * price, else the fallback, else nothing (Shopify then shows no shipping
 * options, which blocks checkout for that address).
 */
export function buildRates(input: {
  postalCode: string;
  currency: string;
  config: RateConfig | null;
  zones: RateZone[];
  now?: Date;
}): ShippingRate[] {
  const { config } = input;
  if (!config || !config.enabled) return [];

  const zone = matchZone(input.zones, input.postalCode);
  let price: number | null = null;
  let description: string | undefined;

  if (zone) {
    if (zone.price === null) return []; // deliverable area but no shipping rate
    price = zone.price;
    description = zone.message ?? undefined;
  } else if (config.fallbackPrice !== null) {
    price = config.fallbackPrice;
  }

  if (price === null) return [];

  const today = (input.now ?? new Date()).toISOString();
  const rate: ShippingRate = {
    service_name: config.title,
    service_code: SERVICE_CODE,
    total_price: toCents(price),
    currency: input.currency,
    min_delivery_date: today,
    max_delivery_date: today,
  };
  if (description) rate.description = description;
  return [rate];
}
