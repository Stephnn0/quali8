import type { ActionFunctionArgs } from "@remix-run/node";
import { getCustomersByIds } from "app/models/app.server/customers/customer.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import {
  createShippingAutomaticDiscount,
  createShippingDiscount,
  deleteShippingCodeDiscount,
} from "app/models/shopify.server/discounts/discounts.server";
import { createAction } from "app/models/app.server/actions/actions.server";
import {
  createActionShippingDiscount,
  updateActionShippingDiscount,
} from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import { formatToYYYYMMDD } from "app/utils/formatDate";

export default async function action({ request }: ActionFunctionArgs) {
  console.log("...action shipping discount...");
  const context = await authenticate.admin(request);

  const formData = await request.formData();

  const body = formData.get("body") as string;

  const parsedBody = JSON.parse(body);

  const customerShopifyIds =
    parsedBody.customers && parsedBody.customers.map((c: any) => c.shopifyId);

  const customers = await getCustomersByIds(customerShopifyIds, db);

  console.log("parsedBody", parsedBody);

  try {
    // ---------------------------------------------------------------- POST
    // ----------------------------------------------------------------

    if (request.method === "POST") {
      console.log("...POST Request...");

      const metafieldData = {
        customers: customers,
        //
        startDate: parsedBody.startDate,
        startTime: parsedBody.startTime,
        hasEndDate: parsedBody.hasEndDate,
        endDate: parsedBody.endDate,
        endTime: parsedBody.endTime,
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

        shippingDiscount = await createShippingDiscount(
          context.admin.graphql,
          parsedBody!.codeOrName,
          JSON.stringify(metafieldData),
        );

        shopifyDiscountId =
          shippingDiscount?.discountCodeAppCreate?.codeAppDiscount?.discountId;
      }

      // ---------------------------------------------------------------- AUTOMATIC
      // ----------------------------------------------------------------
      // ----------------------------------------------------------------
      // ----------------------------------------------------------------

      if (parsedBody.automaticOrCode === "AUTOMATIC") {
        console.log("...AUTOMATIC..");

        shippingDiscount = await createShippingAutomaticDiscount(
          context.admin.graphql,
          parsedBody!.codeOrName,
          JSON.stringify(metafieldData),
          "92f98185-5407-46c4-85d9-11594cc32d07", // functionId
          formatToYYYYMMDD(parsedBody.startDate),
          formatToYYYYMMDD(parsedBody.endDate),
          parsedBody.usageLimit, // number
          parsedBody.appliesOncePerCustomer, // boolean
        );

        shopifyDiscountId =
          shippingDiscount?.discountAutomaticAppCreate?.automaticAppDiscount
            ?.discountId;
      }

      const action = await createAction(
        {
          data: {
            type: "SHIPPING_DISCOUNTS",
            createdAt: new Date(),
            shopifyStore: { connect: { shop: context.session.shop } },
            qualifiers: {
              connect: parsedBody.qualifiersIds.map((id: number) => ({ id })),
            },
          },
        },
        db,
      );

      if (action && shippingDiscount) {
        await createActionShippingDiscount(
          {
            data: {
              marketingActionId: action?.id,
              //
              automaticOrCode: parsedBody.automaticOrCode,
              codeOrName: parsedBody.codeOrName,
              type: parsedBody.type,
              value: parsedBody.value,
              //
              shippingRateType: parsedBody.shippingRateType,
              shippingRatesIds: parsedBody.shippingRatesIds,
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
        startDate: parsedBody.startDate,
        startTime: parsedBody.startTime,
        hasEndDate: parsedBody.hasEndDate,
        endDate: parsedBody.endDate,
        endTime: parsedBody.endTime,
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

        // ! delete old discount
        await deleteShippingCodeDiscount(
          context.admin.graphql,
          parsedBody.shopifyDiscountId,
        );

        // ! create new discount

        const newshippingDiscount = await createShippingDiscount(
          context.admin.graphql,
          parsedBody!.codeOrName,
          JSON.stringify(metafieldDataUpdate),
        );

        // ! grab id

        const newShopifyDiscountId =
          newshippingDiscount?.discountCodeAppCreate?.codeAppDiscount
            ?.discountId;

        // ! update id in prisma
        // ! update fields in prisma

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

      console.log("...SUCESSSSSSSSSSSSSS..");

      if (parsedBody.automaticOrCode === "AUTOMATIC") {
        console.log("...AUTOMATIC..");
      }

      // ! todo: update actionShippingDiscount
    }

    return { payload: null };
  } catch (error) {
    console.error("API Get Customers Error: ", error);
  }
}
