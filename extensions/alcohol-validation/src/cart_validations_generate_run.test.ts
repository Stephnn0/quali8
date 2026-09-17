import { describe, expect, it } from "vitest";
import { cartValidationsGenerateRun } from "./cart_validations_generate_run";
import type { CartValidationsGenerateRunInput } from "../generated/api";

const config = {
  collectionIds: ["gid://shopify/Collection/1"],
  minimumAge: 21,
  ageCheck: true,
  localOnly: true,
  notAlone: true,
  zips: ["331*"],
  messages: { age: "Age {age}", localOnly: "Local", notAlone: "Alone" },
};

type Line = { alcohol: boolean };
type Opts = {
  step?: string;
  lines?: Line[];
  method?: string | null;
  dob?: string | null;
  confirmed?: string | null;
  zip?: string | null;
  selected?: string | null;
  config?: object | null;
};

function input(opts: Opts): CartValidationsGenerateRunInput {
  const lines = opts.lines ?? [{ alcohol: true }, { alcohol: false }];
  const attr = (given: string | null | undefined, fallback: string) =>
    given === undefined ? { value: fallback } : given === null ? null : { value: given };
  return {
    buyerJourney: { step: (opts.step ?? "CHECKOUT_INTERACTION") as never },
    validation: { metafield: opts.config === null ? null : { jsonValue: opts.config ?? config } },
    cart: {
      deliveryMethod: attr(opts.method, "Delivery"),
      dateOfBirth: attr(opts.dob, "1990-01-01"),
      ageConfirmed: attr(opts.confirmed, "Yes"),
      lines: lines.map((line) => ({
        quantity: 1,
        merchandise: { __typename: "ProductVariant", product: { isAlcohol: line.alcohol } },
      })),
      deliveryGroups: [
        {
          deliveryAddress: opts.zip === null ? null : { zip: opts.zip ?? "33101" },
          selectedDeliveryOption:
            opts.selected === null ? null : { deliveryMethodType: (opts.selected ?? "SHIPPING") as never },
        },
      ],
    },
  } as CartValidationsGenerateRunInput;
}

const errors = (i: CartValidationsGenerateRunInput) =>
  cartValidationsGenerateRun(i).operations.flatMap((op) => op.validationAdd?.errors ?? []);

describe("alcohol validation", () => {
  it("passes a compliant cart", () => {
    expect(errors(input({}))).toEqual([]);
  });

  it("stays silent at cart interaction", () => {
    expect(errors(input({ step: "CART_INTERACTION", lines: [{ alcohol: true }], dob: null }))).toEqual([]);
  });

  it("stays silent without config, with empty collections, or without alcohol", () => {
    expect(errors(input({ config: null, lines: [{ alcohol: true }] }))).toEqual([]);
    expect(errors(input({ config: { ...config, collectionIds: [] }, lines: [{ alcohol: true }] }))).toEqual([]);
    expect(errors(input({ lines: [{ alcohol: false }], dob: null }))).toEqual([]);
  });

  it("blocks alcohol alone on the cart", () => {
    expect(errors(input({ lines: [{ alcohol: true }] }))).toEqual([{ message: "Alone", target: "$.cart" }]);
  });

  it("blocks delivery outside the zones on the zip field", () => {
    expect(errors(input({ zip: "90210" }))).toEqual([
      { message: "Local", target: "$.cart.deliveryGroups[0].deliveryAddress.zip" },
    ]);
    expect(errors(input({ zip: null }))).toHaveLength(1);
    expect(errors(input({ zip: "33150-1234" }))).toEqual([]);
  });

  it("lets pickup through regardless of zip", () => {
    expect(errors(input({ zip: "90210", method: "Pickup" }))).toEqual([]);
    expect(errors(input({ zip: "90210", method: null, selected: "PICK_UP" }))).toEqual([]);
    expect(errors(input({ zip: "90210", method: null, selected: "SHIPPING" }))).toHaveLength(1);
  });

  it("requires the age attributes", () => {
    expect(errors(input({ dob: null }))).toEqual([{ message: "Age 21", target: "$.cart" }]);
    expect(errors(input({ confirmed: "no" }))).toHaveLength(1);
    expect(errors(input({ confirmed: null }))).toHaveLength(1);
    expect(errors(input({ dob: "1/1/1990" }))).toHaveLength(1);
    expect(errors(input({ confirmed: " YES " }))).toEqual([]);
  });

  it("also blocks at checkout completion", () => {
    expect(errors(input({ step: "CHECKOUT_COMPLETION", dob: null }))).toHaveLength(1);
  });

  it("honours switched-off rules in the config", () => {
    expect(errors(input({ config: { ...config, ageCheck: false }, dob: null }))).toEqual([]);
    expect(errors(input({ config: { ...config, notAlone: false }, lines: [{ alcohol: true }] }))).toEqual([]);
    expect(errors(input({ config: { ...config, localOnly: false }, zip: "90210" }))).toEqual([]);
  });

  it("reports every broken rule at once", () => {
    const all = errors(input({ lines: [{ alcohol: true }], zip: "90210", dob: null }));
    expect(all.map((e) => e.message)).toEqual(["Alone", "Local", "Age 21"]);
  });
});
