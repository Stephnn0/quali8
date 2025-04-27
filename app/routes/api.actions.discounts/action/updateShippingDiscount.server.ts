import type { AuthAdminContext } from "app/types/utility/shopify";
import type { UpdateBody } from "../zod";
import { updateActionShippingDiscount } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import {
  createShippingAutomaticDiscount,
  createShippingDiscount,
  deleteShippingAutomaticDiscount,
  deleteShippingCodeDiscount,
} from "app/models/shopify.server/discounts/discounts.server";
import { getFormattedDiscountDates } from "app/utils/formattedDiscountDates";
import db from "app/db.server";
import { getCustomersByIds } from "app/models/app.server/customers/customer.server";

export default async function updateShippingDiscountServer(
  authAdminContext: AuthAdminContext,
  body: UpdateBody,
) {
  const { admin } = authAdminContext;

  const customerShopifyIds =
    body.customers && body.customers.map((c) => c.shopifyId);

  const customers = await getCustomersByIds(customerShopifyIds, db);

  const metafieldDataUpdate = {
    id: body.id,
    shopifyDiscountId: body.shopifyDiscountId,
    //
    customers: customers,
    //
    code: body.codeOrName,
    type: body.type, // ! percentage or fixed
    value: body.value,
    //
    shippingRateType: body.shippingRateType, // ! ALL_RATES or CUSTOMED_RATES
    shippingRatesNames: body.shippingRatesNames,
  };

  let newShopifyDiscountId;

  if (body.automaticOrCode === "CODE") {
    console.log("...CODE..");
    await deleteShippingCodeDiscount(admin.graphql, body.shopifyDiscountId);

    const { formattedStartDate, formattedEndDate } = getFormattedDiscountDates({
      hasEndDate: body.hasEndDate,
      shippingDiscountState: body.shippingDiscountState!,
      startDate: body.startDate!,
      startTime: body.startTime!,
      endDate: body.endDate!,
      endTime: body.endTime!,
    });

    const newshippingDiscount = await createShippingDiscount({
      graphql: admin.graphql,
      code: body.codeOrName!,
      body: JSON.stringify(metafieldDataUpdate),
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      shippingDiscountState: body.shippingDiscountState!,
      limitUsagePerOneCustomer: body.limitUsagePerOneCustomer!,
      combinedWithOrderDiscounts: body.combinedWithOrderDiscounts!,
      combinedWithProductDiscounts: body.combinedWithProductDiscounts!,
    });

    newShopifyDiscountId =
      newshippingDiscount?.discountCodeAppCreate?.codeAppDiscount?.discountId;
  }
  if (body.automaticOrCode === "AUTOMATIC") {
    console.log("...AUTOMATIC..");

    await deleteShippingAutomaticDiscount(
      admin.graphql,
      body.shopifyDiscountId,
    );

    const { formattedStartDate, formattedEndDate } = getFormattedDiscountDates({
      hasEndDate: body.hasEndDate,
      shippingDiscountState: body.shippingDiscountState!,
      startDate: body.startDate!,
      startTime: body.startTime!,
      endDate: body.endDate!,
      endTime: body.endTime!,
    });

    const newshippingDiscount = await createShippingAutomaticDiscount({
      graphql: admin.graphql,
      title: body.codeOrName!,
      body: JSON.stringify(metafieldDataUpdate),
      functionId: "92f98185-5407-46c4-85d9-11594cc32d07", // functionId
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      shippingDiscountState: body.shippingDiscountState!,
      combinedWithOrderDiscounts: body.combinedWithOrderDiscounts!,
      combinedWithProductDiscounts: body.combinedWithProductDiscounts!,
    });

    newShopifyDiscountId =
      newshippingDiscount?.discountAutomaticAppCreate?.automaticAppDiscount
        ?.discountId;
  }

  if (newShopifyDiscountId) {
    await updateActionShippingDiscount(
      {
        where: { id: body.id },
        data: {
          shopifyDiscountId: newShopifyDiscountId,
          //
          shippingDiscountState: body.shippingDiscountState,
          codeOrName: body.codeOrName,
          //
          limitUsagePerOneCustomer: body.limitUsagePerOneCustomer,
          //
          type: body.type!,
          value: body.value!,
          //
          combinedWithOrderDiscounts: body.combinedWithOrderDiscounts,
          combinedWithProductDiscounts: body.combinedWithProductDiscounts,
          //
          automaticOrCode: body.automaticOrCode!,
          //
          qualifierIds: body.qualifierIds,
          qualifiers: {
            connect: body.qualifierIds?.map((id: number) => ({ id })),
          },
          //
          shippingRatesNames: body.shippingRatesNames,
          shippingRateType: body.shippingRateType!,
          //
          startDate: body.startDate,
          startTime: body.startTime,
          hasEndDate: body.hasEndDate,
          endDate: body.endDate,
          endTime: body.endTime,
        },
      },
      db,
    );
  }

  return { data: newShopifyDiscountId };
}
