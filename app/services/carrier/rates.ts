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
  /** Rate name outside every zone; inside a zone the rate is named after the zone. */
  title: string;
  fallbackPrice: number | null;
};

/** The timed delivery window the shopper picked in the cart (see timedDelivery.ts). */
export type RateTimeWindow = {
  label: string;
  price: number;
};

export const DEFAULT_RATE_TITLE = "Non-local delivery";
export const TIMED_SUFFIX = "Timed delivery";

export const toCents = (amount: number): string =>
  String(Math.round(amount * 100));

/** "Coconut Grove", or "Coconut Grove + Timed delivery (Before 12:00 PM)". */
export function rateName(base: string, timeWindow: RateTimeWindow | null | undefined): string {
  return timeWindow ? `${base} + ${TIMED_SUFFIX} (${timeWindow.label})` : base;
}

/**
 * The rates to return for a destination postal code: the matching zone's
 * price under the zone's name, else the fallback price under the rate
 * title, else nothing (Shopify then shows no shipping options, which
 * blocks checkout for that address). A picked timed delivery window adds
 * its surcharge and is named in the rate.
 */
export function buildRates(input: {
  postalCode: string;
  currency: string;
  config: RateConfig | null;
  zones: RateZone[];
  timeWindow?: RateTimeWindow | null;
  now?: Date;
}): ShippingRate[] {
  const { config } = input;
  if (!config || !config.enabled) return [];

  const zone = matchZone(input.zones, input.postalCode);
  let price: number | null = null;
  let name = config.title.trim() || DEFAULT_RATE_TITLE;
  let description: string | undefined;

  if (zone) {
    if (zone.price === null) return []; // deliverable area but no shipping rate
    price = zone.price;
    name = zone.name.trim() || name;
    description = zone.message ?? undefined;
  } else if (config.fallbackPrice !== null) {
    price = config.fallbackPrice;
  }

  if (price === null) return [];
  if (input.timeWindow) price += input.timeWindow.price;

  const today = (input.now ?? new Date()).toISOString();
  const rate: ShippingRate = {
    service_name: rateName(name, input.timeWindow),
    service_code: SERVICE_CODE,
    total_price: toCents(price),
    currency: input.currency,
    min_delivery_date: today,
    max_delivery_date: today,
  };
  if (description) rate.description = description;
  return [rate];
}
