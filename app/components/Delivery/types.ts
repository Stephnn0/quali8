/** Client-safe shapes for the delivery zip checker admin. */

export type DeliveryZoneRow = {
  id: number;
  name: string;
  /** Normalised entries; a trailing "*" marks a prefix. */
  zipCodes: string[];
  /** Delivery price in the shop currency; 0 = free; null = not shown. */
  price: number | null;
  message: string | null;
  active: boolean;
};

export type DeliveryConfig = {
  enabled: boolean;
  zones: DeliveryZoneRow[];
};
