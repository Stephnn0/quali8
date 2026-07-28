import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
  type CartDeliveryOptionsInput,
  type CartDeliveryOptionsDiscountsGenerateRunResult,
  type DeliveryDiscountCandidateTarget,
  type DeliveryDiscountCandidateValue,
} from "../generated/api";
import type { Customer, ParsedBody } from "./types";

const EMPTY: CartDeliveryOptionsDiscountsGenerateRunResult = {
  operations: [],
};

/**
 * Shipping discount on the modern Discount API
 * (cart.delivery-options.discounts.generate.run — the deprecated
 * purchase.shipping-discount.run target this migrated from is no longer
 * accepted for new discounts). The promotion config comes from the
 * `quali8_shipping_discounts` json metafield written by
 * api.actions.discounts, and the decision order is unchanged:
 * minimum cart value → customer eligibility → shipping rate selection →
 * discount value.
 */
export function cartDeliveryOptionsDiscountsGenerateRun(
  input: CartDeliveryOptionsInput,
): CartDeliveryOptionsDiscountsGenerateRunResult {
  if (!input.discount.discountClasses.includes(DiscountClass.Shipping)) {
    return EMPTY;
  }

  const parsedBody = parseConfig(input.discount.metafield?.jsonValue);
  if (!parsedBody) return EMPTY;

  // 1. Minimum cart value
  if (parsedBody.isMinimumCartValueEnabled) {
    const subtotal = Number(input.cart.cost.subtotalAmount.amount);
    if (subtotal < parsedBody.minimumCartValue) return EMPTY;
  }

  // 2. Customer eligibility
  const customerId = input.cart.buyerIdentity?.customer?.id;
  const isCustomerInList =
    !!customerId &&
    parsedBody.customers.some(
      (customer: Customer) => customer.shopifyId === customerId,
    );
  const isEligibleCustomer =
    parsedBody.appliesToAllCustomers || isCustomerInList;
  if (!isEligibleCustomer) return EMPTY;

  // 3. Shipping rate selection
  const targets: DeliveryDiscountCandidateTarget[] = [];
  for (const deliveryGroup of input.cart.deliveryGroups) {
    for (const option of deliveryGroup.deliveryOptions) {
      const matches =
        parsedBody.shippingRateType === "ALL_RATES" ||
        (option.title != null &&
          parsedBody.shippingRatesNames.includes(option.title));
      if (matches) {
        targets.push({ deliveryOption: { handle: option.handle } });
      }
    }
  }
  if (targets.length === 0) return EMPTY;

  // 4. Discount value
  const amount = Number.parseFloat(parsedBody.value);
  if (!Number.isFinite(amount) || amount <= 0) return EMPTY;

  const value: DeliveryDiscountCandidateValue =
    parsedBody.type === "fixed"
      ? { fixedAmount: { amount } }
      : { percentage: { value: amount } };

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
          candidates: [
            {
              message: parsedBody.code || "Shipping discount",
              targets,
              value,
            },
          ],
        },
      },
    ],
  };
}

/** Defensive parse — a malformed metafield must never break checkout. */
function parseConfig(jsonValue: unknown): ParsedBody | null {
  if (jsonValue == null) return null;

  // Legacy discounts stored the config as a JSON string metafield; current
  // ones use a json metafield. Support both.
  const raw =
    typeof jsonValue === "string" ? safeJsonParse(jsonValue) : jsonValue;
  if (raw == null || typeof raw !== "object") return null;

  const body = raw as Partial<Omit<ParsedBody, "value">> & {
    value?: unknown;
    minimumCartValue?: unknown;
  };

  // The app writes `value` as a number (zod validates z.number()); older
  // configs stored a string. Accept both — rejecting numbers made every
  // discount "valid but not applicable" at checkout.
  const value =
    typeof body.value === "number"
      ? String(body.value)
      : typeof body.value === "string"
        ? body.value
        : null;
  if (value === null || value.trim() === "") return null;
  if (body.type !== "percentage" && body.type !== "fixed") return null;

  const minimumCartValue =
    typeof body.minimumCartValue === "number"
      ? body.minimumCartValue
      : typeof body.minimumCartValue === "string"
        ? Number.parseFloat(body.minimumCartValue) || 0
        : 0;

  return {
    shippingRateType:
      body.shippingRateType === "SELECTED_RATES"
        ? "SELECTED_RATES"
        : "ALL_RATES",
    type: body.type,
    code: typeof body.code === "string" ? body.code : "",
    value: value,
    customers: Array.isArray(body.customers) ? body.customers : [],
    shippingRatesNames: Array.isArray(body.shippingRatesNames)
      ? body.shippingRatesNames
      : [],
    startDate: typeof body.startDate === "string" ? body.startDate : "",
    startTime: typeof body.startTime === "string" ? body.startTime : "",
    hasEndDate: Boolean(body.hasEndDate),
    endDate: typeof body.endDate === "string" ? body.endDate : "",
    endTime: typeof body.endTime === "string" ? body.endTime : "",
    appliesToAllCustomers: Boolean(body.appliesToAllCustomers),
    isMinimumCartValueEnabled: Boolean(body.isMinimumCartValueEnabled),
    minimumCartValue: minimumCartValue,
  };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
