import type { ActionFunctionArgs } from "@remix-run/node";
import { getCustomersByIds } from "app/models/app.server/customers/customer.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { createShippingDiscount } from "app/models/shopify.server/discounts/discounts.server";
import { createAction } from "app/models/app.server/actions/actions.server";
import { createActionShippingDiscount } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";

export default async function action({ request }: ActionFunctionArgs) {
  console.log("---------action app  actions discounts---------");
  const context = await authenticate.admin(request);

  const formData = await request.formData();

  const body = formData.get("body") as string;

  const parsedBody = JSON.parse(body);

  console.log("parsedBody", parsedBody);

  try {
    if (request.method === "POST") {
      console.log("---------POST request received---------");
      const customerEmails =
        parsedBody.customers && parsedBody.customers.map((c: any) => c.email);

      const customers = await getCustomersByIds(customerEmails, db);

      console.log("customers", customers);

      if (parsedBody.automaticOrCode === "CODE") {
        console.log("---------CODE---------");

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
          type: parsedBody.type,
          value: parsedBody.value,
          //
          shippingRateType: parsedBody.shippingRateType,
          shippingRatesIds: parsedBody.shippingRatesIds,
        };

        console.log("metafieldData", metafieldData);

        const [shippingDiscount] = await Promise.all([
          createShippingDiscount(
            context.admin.graphql,
            parsedBody!.codeOrName,
            JSON.stringify(metafieldData),
          ),
        ]);

        console.log("shippingDiscount ", shippingDiscount);

        console.log("------------------create action------------------");

        const action = await createAction(
          {
            data: {
              type: "SHIPPING_DISCOUNTS",
              createdAt: new Date(),
              shopifyStore: { connect: { shop: context.session.shop } },
            },
          },
          db,
        );

        console.log("action", action);

        console.log(
          "------------------create shipping discount db------------------",
        );
        if (action) {
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
              },
            },
            db,
          );
        }

        return { payload: shippingDiscount };
      } else if (parsedBody.automaticOrCode === "AUTOMATIC") {
        return { payload: null };
      }

      return { payload: null };
    }

    return { payload: null };
  } catch (error) {
    console.error("API Get Customers Error: ", error);
  }
}
