import type { RunInput, FunctionRunResult, Target } from "../generated/api";
import type { Customer, ParsedBody } from "./types";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discounts: [],
};

export function run(input: RunInput): FunctionRunResult {
  console.log("... function executed ...");

  const parsedBody: ParsedBody = JSON.parse(
    input.discountNode.metafield?.value as string,
  );

  //!  ------------------------------ TESTING -----------------------------------
  // console.log("parsedBody", JSON.stringify(parsedBody, null, 2));
  // console.log(
  //   JSON.stringify(input.cart.deliveryGroups, null, 2),
  //   "input.cart.deliveryGroups",
  // );
  // console.log(
  //   "input.cart.buyerIdentity",
  //   JSON.stringify(input.cart.buyerIdentity, null, 2),
  // );
  //!  ------------------------------ TESTING END-----------------------------------

  if (input.cart.buyerIdentity === null) {
    return EMPTY_DISCOUNT;
  }

  const customerId = input.cart.buyerIdentity?.customer?.id;

  const isCustomerInList = parsedBody.customers.some(
    (customer: Customer) => customer.shopifyId === customerId,
  );

  if (isCustomerInList) {
    console.log("... customer in list ...");
    const deliveryOptions: Target[] = [];

    // ! TODO: check date and time

    // =============================================================== DECIDE IF ALL SHIIPING RATES APPLY OR A CUSTOM
    // ===============================================================
    // ===============================================================
    // ===============================================================

    if (parsedBody.shippingRateType === "ALL_RATES") {
      console.log("... ALL_RATES ...");

      for (const deliveryGroup of input.cart.deliveryGroups) {
        for (const option of deliveryGroup.deliveryOptions) {
          deliveryOptions.push({
            deliveryOption: {
              handle: option.handle,
            },
          });
        }
      }
    }

    if (parsedBody.shippingRateType === "SELECTED_RATES") {
      console.log("... CUSTOM_RATES ...");
      for (const deliveryGroup of input.cart.deliveryGroups) {
        for (const option of deliveryGroup.deliveryOptions) {
          if (
            option.title &&
            parsedBody.shippingRatesNames.includes(option.title)
          ) {
            deliveryOptions.push({
              deliveryOption: {
                handle: option.handle,
              },
            });
          }
        }
      }
    }

    let discountValue;

    // =============================================================== DECIDE IF APPLY PERCENTAGE OR FIXED
    // ===============================================================
    // ===============================================================
    // ===============================================================

    switch (parsedBody.type) {
      case "fixed":
        console.log("... fixed ...");

        discountValue = {
          fixedAmount: {
            amount: parseFloat(parsedBody.value),
          },
        };
        break;
      case "percentage":
        console.log("... percentage ...");

        discountValue = {
          percentage: {
            value: parseFloat(parsedBody.value),
          },
        };
        break;
      default:
        discountValue = {
          fixedAmount: {
            amount: 0,
          },
        };
    }

    return {
      discounts: [
        {
          targets: deliveryOptions,
          value: discountValue,
        },
      ],
    };
  }

  return EMPTY_DISCOUNT;
}
