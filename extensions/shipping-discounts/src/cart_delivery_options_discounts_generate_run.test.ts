import { describe, expect, it } from "vitest";
import { cartDeliveryOptionsDiscountsGenerateRun } from "./cart_delivery_options_discounts_generate_run";
import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
  type CartDeliveryOptionsInput,
} from "../generated/api";

const config = (overrides: Record<string, unknown> = {}) => ({
  shippingRateType: "ALL_RATES",
  type: "percentage",
  code: "FREESHIP",
  value: "10",
  customers: [],
  shippingRatesNames: [],
  startDate: "",
  startTime: "",
  hasEndDate: false,
  endDate: "",
  endTime: "",
  appliesToAllCustomers: true,
  isMinimumCartValueEnabled: false,
  minimumCartValue: 0,
  ...overrides,
});

const input = (
  overrides: {
    metafield?: unknown;
    subtotal?: string;
    customerId?: string | null;
    discountClasses?: DiscountClass[];
  } = {},
): CartDeliveryOptionsInput =>
  ({
    cart: {
      cost: { subtotalAmount: { amount: overrides.subtotal ?? "100.0" } },
      buyerIdentity:
        overrides.customerId === undefined
          ? null
          : overrides.customerId === null
            ? null
            : { customer: { id: overrides.customerId } },
      deliveryGroups: [
        {
          id: "gid://shopify/CartDeliveryGroup/1",
          deliveryOptions: [
            { handle: "standard-handle", title: "Standard" },
            { handle: "express-handle", title: "Express" },
          ],
        },
      ],
    },
    discount: {
      discountClasses: overrides.discountClasses ?? [DiscountClass.Shipping],
      metafield:
        "metafield" in overrides
          ? overrides.metafield === null
            ? null
            : { jsonValue: overrides.metafield }
          : { jsonValue: config() },
    },
  }) as CartDeliveryOptionsInput;

describe("cartDeliveryOptionsDiscountsGenerateRun", () => {
  it("returns no operations without a config metafield", () => {
    expect(
      cartDeliveryOptionsDiscountsGenerateRun(input({ metafield: null })),
    ).toEqual({ operations: [] });
  });

  it("returns no operations when the discount lacks the SHIPPING class", () => {
    expect(
      cartDeliveryOptionsDiscountsGenerateRun(
        input({ discountClasses: [DiscountClass.Product] }),
      ),
    ).toEqual({ operations: [] });
  });

  it("discounts every delivery option for ALL_RATES", () => {
    const result = cartDeliveryOptionsDiscountsGenerateRun(input());
    expect(result.operations).toHaveLength(1);
    const add = result.operations[0].deliveryDiscountsAdd!;
    expect(add.selectionStrategy).toBe(DeliveryDiscountSelectionStrategy.All);
    expect(add.candidates).toHaveLength(1);
    expect(add.candidates[0].targets).toEqual([
      { deliveryOption: { handle: "standard-handle" } },
      { deliveryOption: { handle: "express-handle" } },
    ]);
    expect(add.candidates[0].value).toEqual({ percentage: { value: 10 } });
    expect(add.candidates[0].message).toBe("FREESHIP");
  });

  it("only targets the selected rates for SELECTED_RATES", () => {
    const result = cartDeliveryOptionsDiscountsGenerateRun(
      input({
        metafield: config({
          shippingRateType: "SELECTED_RATES",
          shippingRatesNames: ["Express"],
        }),
      }),
    );
    expect(
      result.operations[0].deliveryDiscountsAdd!.candidates[0].targets,
    ).toEqual([{ deliveryOption: { handle: "express-handle" } }]);
  });

  it("applies fixed amounts", () => {
    const result = cartDeliveryOptionsDiscountsGenerateRun(
      input({ metafield: config({ type: "fixed", value: "5.50" }) }),
    );
    expect(
      result.operations[0].deliveryDiscountsAdd!.candidates[0].value,
    ).toEqual({ fixedAmount: { amount: 5.5 } });
  });

  it("enforces the minimum cart value", () => {
    const under = cartDeliveryOptionsDiscountsGenerateRun(
      input({
        subtotal: "30.0",
        metafield: config({
          isMinimumCartValueEnabled: true,
          minimumCartValue: 50,
        }),
      }),
    );
    expect(under).toEqual({ operations: [] });

    const over = cartDeliveryOptionsDiscountsGenerateRun(
      input({
        subtotal: "80.0",
        metafield: config({
          isMinimumCartValueEnabled: true,
          minimumCartValue: 50,
        }),
      }),
    );
    expect(over.operations).toHaveLength(1);
  });

  it("restricts to listed customers when not applying to everyone", () => {
    const targeted = config({
      appliesToAllCustomers: false,
      customers: [{ shopifyId: "gid://shopify/Customer/42" }],
    });

    expect(
      cartDeliveryOptionsDiscountsGenerateRun(
        input({ metafield: targeted, customerId: null }),
      ),
    ).toEqual({ operations: [] });

    expect(
      cartDeliveryOptionsDiscountsGenerateRun(
        input({ metafield: targeted, customerId: "gid://shopify/Customer/7" }),
      ),
    ).toEqual({ operations: [] });

    expect(
      cartDeliveryOptionsDiscountsGenerateRun(
        input({ metafield: targeted, customerId: "gid://shopify/Customer/42" }),
      ).operations,
    ).toHaveLength(1);
  });

  it("accepts numeric value and minimumCartValue (what the app writes)", () => {
    // Regression: zod validates value as z.number(), so the metafield JSON
    // carries numbers — a strict string check made every discount "valid
    // but not applicable" at checkout.
    const result = cartDeliveryOptionsDiscountsGenerateRun(
      input({ metafield: config({ value: 1, type: "percentage" }) }),
    );
    expect(
      result.operations[0].deliveryDiscountsAdd!.candidates[0].value,
    ).toEqual({ percentage: { value: 1 } });

    const withMinimum = cartDeliveryOptionsDiscountsGenerateRun(
      input({
        subtotal: "80.0",
        metafield: config({
          value: 5,
          type: "fixed",
          isMinimumCartValueEnabled: true,
          minimumCartValue: 50,
        }),
      }),
    );
    expect(
      withMinimum.operations[0].deliveryDiscountsAdd!.candidates[0].value,
    ).toEqual({ fixedAmount: { amount: 5 } });
  });

  it("supports legacy string metafields", () => {
    const result = cartDeliveryOptionsDiscountsGenerateRun(
      input({ metafield: JSON.stringify(config()) }),
    );
    expect(result.operations).toHaveLength(1);
  });

  it("returns no operations for a zero or malformed value", () => {
    expect(
      cartDeliveryOptionsDiscountsGenerateRun(
        input({ metafield: config({ value: "0" }) }),
      ),
    ).toEqual({ operations: [] });
    expect(
      cartDeliveryOptionsDiscountsGenerateRun(
        input({ metafield: config({ value: "abc" }) }),
      ),
    ).toEqual({ operations: [] });
    expect(
      cartDeliveryOptionsDiscountsGenerateRun(
        input({ metafield: "not json{" }),
      ),
    ).toEqual({ operations: [] });
  });
});
