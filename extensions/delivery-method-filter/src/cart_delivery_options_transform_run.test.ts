import { describe, expect, it } from "vitest";
import { cartDeliveryOptionsTransformRun, chosenMethod } from "./cart_delivery_options_transform_run";
import type { CartDeliveryOptionsTransformRunInput, DeliveryMethod } from "../generated/api";

const option = (handle: string, type: string) => ({ handle, deliveryMethodType: type as DeliveryMethod });

const input = (method: string | null, options = [option("ship-a", "SHIPPING"), option("local-b", "LOCAL"), option("pickup-c", "PICK_UP"), option("point-d", "PICKUP_POINT")]): CartDeliveryOptionsTransformRunInput => ({
  cart: {
    deliveryMethod: method === null ? null : { value: method },
    deliveryGroups: [{ deliveryOptions: options }],
  },
});

const hidden = (result: { operations: Array<{ deliveryOptionHide?: { deliveryOptionHandle: string } }> }) =>
  result.operations.map((op) => op.deliveryOptionHide?.deliveryOptionHandle);

describe("delivery method filter", () => {
  it("keeps only local pickup when the shopper chose Pickup", () => {
    expect(hidden(cartDeliveryOptionsTransformRun(input("Pickup")))).toEqual(["ship-a", "local-b", "point-d"]);
  });

  it("keeps shipping and local delivery when the shopper chose Delivery", () => {
    expect(hidden(cartDeliveryOptionsTransformRun(input("Delivery")))).toEqual(["pickup-c", "point-d"]);
  });

  it("does nothing without the attribute or with an unknown value", () => {
    expect(cartDeliveryOptionsTransformRun(input(null)).operations).toEqual([]);
    expect(cartDeliveryOptionsTransformRun(input("Courier")).operations).toEqual([]);
  });

  it("never hides every option", () => {
    expect(cartDeliveryOptionsTransformRun(input("Pickup", [option("ship-a", "SHIPPING")])).operations).toEqual([]);
    expect(cartDeliveryOptionsTransformRun(input("Delivery", [option("pickup-c", "PICK_UP")])).operations).toEqual([]);
  });

  it("reads the attribute loosely", () => {
    expect(chosenMethod(" pickup ")).toBe("pickup");
    expect(chosenMethod("DELIVERY")).toBe("delivery");
    expect(chosenMethod("")).toBeNull();
    expect(chosenMethod(undefined)).toBeNull();
  });
});
