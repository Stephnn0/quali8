/**
 * Quali8 — Alcohol compliance (Cart & Checkout Validation Function).
 *
 * Reads the rules the merchant saved on the Delivery page from the
 * validation's `$app.alcohol-rules` json metafield (the same JSON binds the
 * `$collectionIds` input variable) and blocks checkout when a cart with
 * alcohol breaks one: not sold alone, delivery outside the zones, or the
 * age attributes the cart block writes are missing. Nothing happens at cart
 * interaction so shoppers can still build the cart and the block can guide
 * them. Functions have no clock, so the date of birth is checked for
 * presence and format only; the cart block makes the underage decision.
 */
import type {
  CartValidationsGenerateRunInput,
  CartValidationsGenerateRunResult,
  ValidationError,
} from "../generated/api";
import { chosenMethod, configToRules, evaluate, zipInZones, type Config, type Method } from "./rules";

const NO_OPERATIONS: CartValidationsGenerateRunResult = { operations: [] };
const ZIP_TARGET = "$.cart.deliveryGroups[0].deliveryAddress.zip";
const CART_TARGET = "$.cart";

function readConfig(input: CartValidationsGenerateRunInput): Config | null {
  const value = input.validation?.metafield?.jsonValue as Partial<Config> | null | undefined;
  if (!value || !Array.isArray(value.collectionIds) || value.collectionIds.length === 0) return null;
  return {
    collectionIds: value.collectionIds,
    minimumAge: Number(value.minimumAge) || 21,
    ageCheck: value.ageCheck !== false,
    localOnly: value.localOnly !== false,
    notAlone: value.notAlone !== false,
    zips: Array.isArray(value.zips) ? value.zips.map(String) : [],
    messages: {
      age: String(value.messages?.age ?? ""),
      localOnly: String(value.messages?.localOnly ?? ""),
      notAlone: String(value.messages?.notAlone ?? ""),
    },
  };
}

export function cartValidationsGenerateRun(
  input: CartValidationsGenerateRunInput,
): CartValidationsGenerateRunResult {
  if (input.buyerJourney?.step === "CART_INTERACTION") return NO_OPERATIONS;
  const config = readConfig(input);
  if (!config) return NO_OPERATIONS;

  let alcoholLineCount = 0;
  let otherLineCount = 0;
  for (const line of input.cart?.lines ?? []) {
    const merchandise = line.merchandise;
    if (merchandise.__typename === "ProductVariant" && merchandise.product.isAlcohol) alcoholLineCount += 1;
    else otherLineCount += 1;
  }
  if (alcoholLineCount === 0) return NO_OPERATIONS;

  const group = input.cart?.deliveryGroups?.[0];
  const selected = group?.selectedDeliveryOption?.deliveryMethodType;
  const method: Method =
    chosenMethod(input.cart?.deliveryMethod?.value) ?? (selected === "PICK_UP" ? "pickup" : "delivery");
  const zip = group?.deliveryAddress?.zip ?? null;

  const problems = evaluate({
    rules: configToRules(config),
    alcoholLineCount,
    otherLineCount,
    method,
    zipDeliverable: zipInZones(zip, config.zips),
    zip,
    dob: input.cart?.dateOfBirth?.value ?? null,
    confirmed: String(input.cart?.ageConfirmed?.value ?? "").trim().toLowerCase() === "yes",
  });
  if (!problems.length) return NO_OPERATIONS;

  const errors: ValidationError[] = problems.map((problem) => ({
    message: problem.message,
    target: problem.rule === "localOnly" ? ZIP_TARGET : CART_TARGET,
  }));
  return { operations: [{ validationAdd: { errors } }] };
}
