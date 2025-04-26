import type { AuthAdminContext } from "app/types/utility/shopify";
import type { CreateBody } from "../zod";
import { createActionShippingDiscount } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import db from "app/db.server";
import {
  createShippingAutomaticDiscount,
  createShippingDiscount,
} from "app/models/shopify.server/discounts/discounts.server";
import { getCustomersByIds } from "app/models/app.server/customers/customer.server";
import { getFormattedDiscountDates } from "app/utils/formattedDiscountDates";

export default async function createShippingDiscountServer(
  authAdminContext: AuthAdminContext,
  body: CreateBody,
) {
  const { admin, session } = authAdminContext;

  const customerShopifyIds =
    body.customers && body.customers.map((c) => c.shopifyId);

  const customers = await getCustomersByIds(customerShopifyIds, db);

  const metafieldData = {
    customers: customers,
    //
    code: body.codeOrName,
    type: body.type, // percentage or fixed
    value: body.value,
    //
    shippingRateType: body.shippingRateType, // ALL_RATES or CUSTOMED_RATES
    shippingRatesNames: body.shippingRatesNames,
  };

  let shippingDiscount;
  let shopifyDiscountId;

  if (body.automaticOrCode === "CODE") {
    console.log("...CODE..");

    const { formattedStartDate, formattedEndDate } = getFormattedDiscountDates({
      hasEndDate: body.hasEndDate,
      shippingDiscountState: body.shippingDiscountState!,
      startDate: body.startDate,
      startTime: body.startTime!,
      endDate: body.endDate!,
      endTime: body.endTime!,
    });

    shippingDiscount = await createShippingDiscount({
      graphql: admin.graphql,
      code: body.codeOrName,
      body: JSON.stringify(metafieldData),
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      shippingDiscountState: body.shippingDiscountState!,
      limitUsagePerOneCustomer: body.limitUsagePerOneCustomer!,
      combinedWithOrderDiscounts: body.combinedWithOrderDiscounts!,
      combinedWithProductDiscounts: body.combinedWithProductDiscounts!,
    });

    shopifyDiscountId =
      shippingDiscount?.discountCodeAppCreate?.codeAppDiscount?.discountId;
  }

  if (body.automaticOrCode === "AUTOMATIC") {
    console.log("...AUTOMATIC..");

    const { formattedStartDate, formattedEndDate } = getFormattedDiscountDates({
      hasEndDate: body.hasEndDate,
      shippingDiscountState: body.shippingDiscountState!,
      startDate: body.startDate,
      startTime: body.startTime!,
      endDate: body.endDate,
      endTime: body.endTime!,
    });

    shippingDiscount = await createShippingAutomaticDiscount({
      graphql: admin.graphql,
      title: body.codeOrName,
      body: JSON.stringify(metafieldData),
      functionId: "92f98185-5407-46c4-85d9-11594cc32d07", // functionId
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      shippingDiscountState: body.shippingDiscountState!,
      combinedWithOrderDiscounts: body.combinedWithOrderDiscounts!,
      combinedWithProductDiscounts: body.combinedWithProductDiscounts!,
    });

    shopifyDiscountId =
      shippingDiscount?.discountAutomaticAppCreate?.automaticAppDiscount
        ?.discountId;
  }

  const data: Parameters<typeof createActionShippingDiscount>[0]["data"] = {
    shop: session.shop,
    shopifyDiscountId: shopifyDiscountId,
    //
    shippingDiscountState: body.shippingDiscountState!,
    codeOrName: body.codeOrName,
    //
    limitUsagePerOneCustomer: body.limitUsagePerOneCustomer!,
    //
    type: body.type!,
    value: body.value!,
    //
    combinedWithOrderDiscounts: body.combinedWithOrderDiscounts!,
    combinedWithProductDiscounts: body.combinedWithProductDiscounts!,
    //
    automaticOrCode: body.automaticOrCode!,
    //
    qualifierIds: body.qualifierIds,
    qualifiers: body.qualifierIds?.length
      ? {
          connect: body.qualifierIds.map((id) => ({ id })),
        }
      : undefined,
    //
    shippingRatesNames: body.shippingRatesNames,
    shippingRateType: body.shippingRateType!,
    //
    startDate: body.startDate,
    startTime: body.startTime,
    hasEndDate: body.hasEndDate,
    endDate: body.endDate,
    endTime: body.endTime,
  };

  if (shippingDiscount) {
    await createActionShippingDiscount(
      {
        data: {
          ...data,
        },
      },
      db,
    );
  }

  return { data: shippingDiscount };
}
