import { ShopifyDiscountType } from "@prisma/client";
import type { appSubscriptionModel } from "app/models/shopify.server/appSubscription";

// For some reason types are not inferred correctly, so this function makes it easier
export function getRecurringPricing(
  richSubscription: Awaited<ReturnType<typeof appSubscriptionModel.find>>,
) {
  let recurringPricing;

  const $recurringPricing = richSubscription?.lineItems.find(
    (item) => item.plan.pricingDetails.__typename === "AppRecurringPricing",
  );

  if (
    $recurringPricing?.plan.pricingDetails.__typename === "AppRecurringPricing"
  ) {
    recurringPricing = $recurringPricing.plan.pricingDetails;
  }

  return recurringPricing;
}

// For some reason types are not inferred correctly, so this function makes it easier
export function getUsagePricing(
  richSubscription: Awaited<ReturnType<typeof appSubscriptionModel.find>>,
) {
  let usagePricing;

  const $usagePricing = richSubscription?.lineItems.find(
    (item) => item.plan.pricingDetails.__typename === "AppUsagePricing",
  );

  if ($usagePricing?.plan.pricingDetails.__typename === "AppUsagePricing") {
    usagePricing = $usagePricing.plan.pricingDetails;
  }

  return usagePricing;
}

// For some reason types are not inferred correctly, so this function makes it easier
export function getDiscountAmount(
  recurringPricing: ReturnType<typeof getRecurringPricing>,
) {
  let discountAmount;

  if (
    recurringPricing?.discount?.value.__typename ===
    "AppSubscriptionDiscountAmount"
  ) {
    discountAmount = recurringPricing.discount.value.amount;
  }

  return discountAmount;
}

// For some reason types are not inferred correctly, so this function makes it easier
export function getDiscountPercentage(
  recurringPricing: ReturnType<typeof getRecurringPricing>,
) {
  let discountPercentage;

  if (
    recurringPricing?.discount?.value.__typename ===
    "AppSubscriptionDiscountPercentage"
  ) {
    discountPercentage = recurringPricing.discount.value.percentage;
  }

  return discountPercentage;
}

export function getDiscountType(
  discountAmount: ReturnType<typeof getDiscountAmount>,
  discountPercentage: ReturnType<typeof getDiscountPercentage>,
): ShopifyDiscountType | undefined {
  let discountType;

  if (discountAmount) {
    discountType = ShopifyDiscountType.AMOUNT;
  } else if (discountPercentage) {
    discountType = ShopifyDiscountType.PERCENTAGE;
  }

  return discountType;
}
