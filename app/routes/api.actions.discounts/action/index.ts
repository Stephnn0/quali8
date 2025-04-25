import type { ActionFunctionArgs } from "@remix-run/node";
import { getCustomersByIds } from "app/models/app.server/customers/customer.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import {
  createShippingAutomaticDiscount,
  createShippingDiscount,
  deleteShippingAutomaticDiscount,
  deleteShippingCodeDiscount,
} from "app/models/shopify.server/discounts/discounts.server";
import {
  createActionShippingDiscount,
  updateActionShippingDiscount,
} from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";

export default async function action({ request }: ActionFunctionArgs) {
  console.log("...action shipping discount...");
  const context = await authenticate.admin(request);

  const formData = await request.formData();

  const body = formData.get("body") as string;

  const parsedBody = JSON.parse(body);

  const customerShopifyIds =
    parsedBody.customers && parsedBody.customers.map((c: any) => c.shopifyId);

  const customers = await getCustomersByIds(customerShopifyIds, db);

  try {
    // ---------------------------------------------------------------- POST
    // ----------------------------------------------------------------

    if (request.method === "POST") {
      console.log("...POST Request...");

      const metafieldData = {
        customers: customers,
        //
        code: parsedBody.codeOrName,
        type: parsedBody.type, // percentage or fixed
        value: parsedBody.value,
        //
        shippingRateType: parsedBody.shippingRateType, // ALL_RATES or CUSTOMED_RATES
        shippingRatesNames: parsedBody.shippingRatesNames,
      };

      let shippingDiscount;
      let shopifyDiscountId;
      // ---------------------------------------------------------------- CODE
      // ----------------------------------------------------------------
      // ----------------------------------------------------------------
      // ----------------------------------------------------------------

      if (parsedBody.automaticOrCode === "CODE") {
        console.log("...CODE..");

        const hasEndDate = parsedBody.hasEndDate;
        const shippingDiscountState = parsedBody.shippingDiscountState;

        let formattedStartDate = combineDateAndTime(
          parsedBody.startDate,
          parsedBody.startTime || "12:00 AM",
        );
        let formattedEndDate = hasEndDate
          ? combineDateAndTime(parsedBody.endDate, parsedBody.endTime)
          : "2028-11-01T00:00:00Z";

        if (shippingDiscountState === "DISABLED") {
          formattedStartDate = "2023-01-01T00:00:00Z";
          formattedEndDate = "2023-11-01T00:00:00Z";
        }

        shippingDiscount = await createShippingDiscount({
          graphql: context.admin.graphql,
          code: parsedBody.codeOrName,
          body: JSON.stringify(metafieldData),
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          shippingDiscountState: parsedBody.shippingDiscountState,
          limitUsagePerOneCustomer: parsedBody.limitUsagePerOneCustomer,
          combinedWithOrderDiscounts: parsedBody.combinedWithOrderDiscounts,
          combinedWithProductDiscounts: parsedBody.combinedWithProductDiscounts,
        });

        shopifyDiscountId =
          shippingDiscount?.discountCodeAppCreate?.codeAppDiscount?.discountId;
      }

      // ---------------------------------------------------------------- AUTOMATIC
      // ----------------------------------------------------------------
      // ----------------------------------------------------------------
      // ----------------------------------------------------------------

      if (parsedBody.automaticOrCode === "AUTOMATIC") {
        console.log("...AUTOMATIC..");

        const hasEndDate = parsedBody.hasEndDate;
        const shippingDiscountState = parsedBody.shippingDiscountState;

        let formattedStartDate = combineDateAndTime(
          parsedBody.startDate,
          parsedBody.startTime || "12:00 AM",
        );
        let formattedEndDate = hasEndDate
          ? combineDateAndTime(parsedBody.endDate, parsedBody.endTime)
          : "2028-11-01T00:00:00Z";

        if (shippingDiscountState === "DISABLED") {
          formattedStartDate = "2023-01-01T00:00:00Z";
          formattedEndDate = "2023-11-01T00:00:00Z";
        }

        shippingDiscount = await createShippingAutomaticDiscount({
          graphql: context.admin.graphql,
          title: parsedBody.codeOrName,
          body: JSON.stringify(metafieldData),
          functionId: "92f98185-5407-46c4-85d9-11594cc32d07", // functionId
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          shippingDiscountState: parsedBody.shippingDiscountState,
          combinedWithOrderDiscounts: parsedBody.combinedWithOrderDiscounts,
          combinedWithProductDiscounts: parsedBody.combinedWithProductDiscounts,
        });

        shopifyDiscountId =
          shippingDiscount?.discountAutomaticAppCreate?.automaticAppDiscount
            ?.discountId;
      }

      if (shippingDiscount) {
        await createActionShippingDiscount(
          {
            data: {
              shippingDiscountState: parsedBody.shippingDiscountState,
              limitUsagePerOneCustomer: parsedBody.limitUsagePerOneCustomer,
              combinedWithOrderDiscounts: parsedBody.combinedWithOrderDiscounts,
              combinedWithProductDiscounts:
                parsedBody.combinedWithProductDiscounts,

              qualifiers: {
                connect: parsedBody.qualifiersIds.map((id: number) => ({ id })),
              },

              shop: context.session.shop,
              //
              automaticOrCode: parsedBody.automaticOrCode,
              codeOrName: parsedBody.codeOrName,
              type: parsedBody.type,
              value: parsedBody.value,
              //
              shippingRateType: parsedBody.shippingRateType,
              shippingRatesIds: parsedBody.shippingRatesIds,
              qualifierIds: parsedBody.qualifierIds,
              //
              startDate: parsedBody.startDate
                ? new Date(parsedBody.startDate)
                : undefined,
              startTime: parsedBody.startTime,
              hasEndDate: parsedBody.hasEndDate,
              endDate: parsedBody.endDate
                ? new Date(parsedBody.endDate)
                : undefined,
              endTime: parsedBody.endTime,
              //
              shopifyDiscountId: shopifyDiscountId!,
            },
          },
          db,
        );
      }

      return { payload: shippingDiscount };
    }
    // ---------------------------------------------------------------- PUT
    // ----------------------------------------------------------------
    if (request.method === "PUT") {
      console.log("...PUT Request...");
      const metafieldDataUpdate = {
        id: parsedBody.id,
        shopifyDiscountId: parsedBody.shopifyDiscountId,
        marketingActionId: parsedBody.marketingActionId,
        //
        customers: customers,
        //
        code: parsedBody.codeOrName,
        type: parsedBody.type, // percentage or fixed
        value: parsedBody.value,
        //
        shippingRateType: parsedBody.shippingRateType, // ALL_RATES or CUSTOMED_RATES
        shippingRatesNames: parsedBody.shippingRatesNames,
      };
      console.log("metafieldDataUpdate", metafieldDataUpdate);

      if (parsedBody.automaticOrCode === "CODE") {
        console.log("...CODE..");

        await deleteShippingCodeDiscount(
          context.admin.graphql,
          parsedBody.shopifyDiscountId,
        );

        const hasEndDate = parsedBody.hasEndDate;
        const shippingDiscountState = parsedBody.shippingDiscountState;

        let formattedStartDate = combineDateAndTime(
          parsedBody.startDate,
          parsedBody.startTime || "12:00 AM",
        );
        let formattedEndDate = hasEndDate
          ? combineDateAndTime(parsedBody.endDate, parsedBody.endTime)
          : "2028-11-01T00:00:00Z";

        if (shippingDiscountState === "DISABLED") {
          formattedStartDate = "2023-01-01T00:00:00Z";
          formattedEndDate = "2023-11-01T00:00:00Z";
        }

        const newshippingDiscount = await createShippingDiscount({
          graphql: context.admin.graphql,
          code: parsedBody.codeOrName,
          body: JSON.stringify(metafieldDataUpdate),
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          shippingDiscountState: parsedBody.shippingDiscountState,
          limitUsagePerOneCustomer: parsedBody.limitUsagePerOneCustomer,
          combinedWithOrderDiscounts: parsedBody.combinedWithOrderDiscounts,
          combinedWithProductDiscounts: parsedBody.combinedWithProductDiscounts,
        });

        if (newshippingDiscount.discountCodeAppCreate.userErrors) {
          console.log(
            JSON.stringify(
              newshippingDiscount.discountCodeAppCreate.userErrors,
              null,
              2,
            ),
          );
        }

        const newShopifyDiscountId =
          newshippingDiscount?.discountCodeAppCreate?.codeAppDiscount
            ?.discountId;

        await updateActionShippingDiscount(
          {
            where: { id: parsedBody.id },
            data: {
              codeOrName: parsedBody.codeOrName,
              shopifyDiscountId: newShopifyDiscountId,
              //
              startDate: parsedBody.startDate
                ? new Date(parsedBody.startDate)
                : undefined,
              startTime: parsedBody.startTime,
              hasEndDate: parsedBody.hasEndDate,
              endDate: parsedBody.endDate
                ? new Date(parsedBody.endDate)
                : undefined,
              endTime: parsedBody.endTime,
              //
              qualifierIds: parsedBody.qualifierIds,
              shippingDiscountState: parsedBody.shippingDiscountState,
              limitUsagePerOneCustomer: parsedBody.limitUsagePerOneCustomer,
              combinedWithOrderDiscounts: parsedBody.combinedWithOrderDiscounts,
              combinedWithProductDiscounts:
                parsedBody.combinedWithProductDiscounts,

              qualifiers: {
                connect: parsedBody.qualifiersIds.map((id: number) => ({ id })),
              },
            },
          },
          db,
        );
      }

      console.log("...SUCESSSSSSSSSSSSSS..");

      if (parsedBody.automaticOrCode === "AUTOMATIC") {
        console.log("...AUTOMATIC..");

        await deleteShippingAutomaticDiscount(
          context.admin.graphql,
          parsedBody.shopifyDiscountId,
        );

        const hasEndDate = parsedBody.hasEndDate;
        const shippingDiscountState = parsedBody.shippingDiscountState;

        let formattedStartDate = combineDateAndTime(
          parsedBody.startDate,
          parsedBody.startTime || "12:00 AM",
        );
        let formattedEndDate = hasEndDate
          ? combineDateAndTime(parsedBody.endDate, parsedBody.endTime)
          : "2028-11-01T00:00:00Z";

        if (shippingDiscountState === "DISABLED") {
          formattedStartDate = "2023-01-01T00:00:00Z";
          formattedEndDate = "2023-11-01T00:00:00Z";
        }

        const newshippingDiscount = await createShippingAutomaticDiscount({
          graphql: context.admin.graphql,
          title: parsedBody.codeOrName,
          body: JSON.stringify(metafieldDataUpdate),
          functionId: "92f98185-5407-46c4-85d9-11594cc32d07", // functionId
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          shippingDiscountState: parsedBody.shippingDiscountState,
          combinedWithOrderDiscounts: parsedBody.combinedWithOrderDiscounts,
          combinedWithProductDiscounts: parsedBody.combinedWithProductDiscounts,
        });

        const newShopifyDiscountId =
          newshippingDiscount?.discountAutomaticAppCreate?.automaticAppDiscount
            ?.discountId;

        await updateActionShippingDiscount(
          {
            where: { id: parsedBody.id },
            data: {
              codeOrName: parsedBody.codeOrName,
              shopifyDiscountId: newShopifyDiscountId,
              //
              startDate: parsedBody.startDate
                ? new Date(parsedBody.startDate)
                : undefined,
              startTime: parsedBody.startTime,
              hasEndDate: parsedBody.hasEndDate,
              endDate: parsedBody.endDate
                ? new Date(parsedBody.endDate)
                : undefined,
              endTime: parsedBody.endTime,
            },
          },
          db,
        );
      }
    }

    return { payload: null };
  } catch (error) {
    console.error("API Get Customers Error: ", error);
  }
}

function combineDateAndTime(dateString: string, timeString: string): string {
  const date = new Date(dateString);
  const [time, modifier] = timeString.trim().split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier?.toLowerCase() === "pm" && hours < 12) hours += 12;
  if (modifier?.toLowerCase() === "am" && hours === 12) hours = 0;

  date.setHours(hours);
  date.setMinutes(minutes || 0);
  date.setSeconds(0);
  return date.toISOString();
}
