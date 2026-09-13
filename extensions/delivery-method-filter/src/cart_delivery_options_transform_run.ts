/**
 * Quali8 — Delivery method filter (Delivery Customization Function).
 *
 * The cart page's Delivery checkout block saves the shopper's choice as
 * the cart attribute "Delivery method" = "Delivery" | "Pickup". Checkout
 * offers every method the shop has (Ship / Pickup), so this function hides
 * the options of the method the shopper did not choose: with "Pickup" only
 * local pickup remains, with "Delivery" only shipping and local delivery
 * remain. No attribute — or an unknown value — changes nothing.
 */
import type {
  CartDeliveryOptionsTransformRunInput,
  CartDeliveryOptionsTransformRunResult,
  DeliveryMethod,
  Operation,
} from "../generated/api";

const NO_CHANGES: CartDeliveryOptionsTransformRunResult = { operations: [] };

/** Methods that count as "Pickup" in the cart block. */
const PICKUP_METHODS: ReadonlySet<DeliveryMethod> = new Set(["PICK_UP" as DeliveryMethod]);

/** Methods that count as "Delivery": carrier/shipping rates and Shopify local delivery. */
const DELIVERY_METHODS: ReadonlySet<DeliveryMethod> = new Set(["SHIPPING" as DeliveryMethod, "LOCAL" as DeliveryMethod]);

export type ChosenMethod = "delivery" | "pickup" | null;

/** "Pickup" / "Delivery" (any case, surrounding spaces) → the chosen method. */
export function chosenMethod(value: string | null | undefined): ChosenMethod {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pickup") return "pickup";
  if (normalized === "delivery") return "delivery";
  return null;
}

export function cartDeliveryOptionsTransformRun(
  input: CartDeliveryOptionsTransformRunInput,
): CartDeliveryOptionsTransformRunResult {
  const chosen = chosenMethod(input.cart?.deliveryMethod?.value);
  if (!chosen) return NO_CHANGES;

  const keep = chosen === "pickup" ? PICKUP_METHODS : DELIVERY_METHODS;
  const groups = input.cart?.deliveryGroups ?? [];
  const options = groups.flatMap((group) => group.deliveryOptions ?? []);

  // Never hide everything: if nothing of the chosen kind is on offer, leave
  // checkout alone so the shopper can still complete the order.
  if (!options.some((option) => keep.has(option.deliveryMethodType))) return NO_CHANGES;

  const operations: Operation[] = options
    .filter((option) => !keep.has(option.deliveryMethodType))
    .map((option) => ({ deliveryOptionHide: { deliveryOptionHandle: option.handle } }));

  return operations.length ? { operations } : NO_CHANGES;
}
