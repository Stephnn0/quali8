import type { RunInput, FunctionRunResult, Target } from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discounts: [],
};

export function run(input: RunInput): FunctionRunResult {
  console.log("----------------- function ran ------------------");

  const parsedBody: ParsedBody = JSON.parse(
    input.discountNode.metafield?.value as string,
  );

  // ! testing
  // console.log("parsedBody", JSON.stringify(parsedBody, null, 2));

  console.log(
    JSON.stringify(input.cart.deliveryGroups, null, 2),
    "input.cart.deliveryGroups",
  );

  if (input.cart.buyerIdentity === null) {
    return EMPTY_DISCOUNT;
  }

  const customerId = input.cart.buyerIdentity?.customer?.id;

  const isCustomerInList = parsedBody.customers.some(
    (customer: Customer) => customer.shopifyId === customerId,
  );

  if (isCustomerInList) {
    console.log("customer is in list");
    const deliveryOptions: Target[] = [];

    if (parsedBody.shippingRateType === "ALL-RATES") {
      for (const deliveryGroup of input.cart.deliveryGroups) {
        for (const option of deliveryGroup.deliveryOptions) {
          console.log("option", option);
          deliveryOptions.push({
            deliveryOption: {
              handle: option.handle,
            },
          });
        }
      }
    }

    let discountValue;

    switch (parsedBody.type) {
      case "currency":
        discountValue = {
          fixedAmount: {
            amount: parseFloat(parsedBody.value),
          },
        };
        break;
      case "percentage":
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

type Customer = {
  _id: string;
  firstName: string;
  lastName: string;
  shopifyId: string;
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
  __v: number;
};

type ParsedBody = {
  shippingRateType: "ALL-RATES" | "CUSTOM-RATES";
  customers: Customer[];
  shippingRates: any[]; // You can further define this if you have more details on its structure
  startDate: string; // ISO string date
  startTime: string; // Hour as a string
  hasEndDate: boolean;
  endDate: string; // ISO string date
  endTime: string; // Hour as a string
  code: string;
  type: string;
  value: string;
};

// 3:35:28 │        shipping-discounts │ │ ----------------- function ran ------------------
// 13:35:28 │        shipping-discounts │ │ [
// 13:35:28 │        shipping-discounts │ │   {
// 13:35:28 │        shipping-discounts │ │     "deliveryOptions": [
// 13:35:28 │        shipping-discounts │ │       {
// 13:35:28 │        shipping-discounts │ │         "title": "Economy",
// 13:35:28 │        shipping-discounts │ │         "handle":
// "01d2cd592dd79aa18b0e0810c3fbd83b-7705a2ea0c5efd1128ea4819f74d6808"
// 13:35:28 │        shipping-discounts │ │       },
// 13:35:28 │        shipping-discounts │ │       {
// 13:35:28 │        shipping-discounts │ │         "title": "Standard",
// 13:35:28 │        shipping-discounts │ │         "handle":
// "01d2cd592dd79aa18b0e0810c3fbd83b-6d5a64f58240381019fc074473bab3ab"
// 13:35:28 │        shipping-discounts │ │       }
// 13:35:28 │        shipping-discounts │ │     ]
// 13:35:28 │        shipping-discounts │ │   }
// 13:35:28 │        shipping-discounts │ │ ] input.cart.deliveryGroups
