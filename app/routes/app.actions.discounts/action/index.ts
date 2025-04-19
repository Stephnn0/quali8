import type { ActionFunctionArgs } from "@remix-run/node";
import { getCustomersByIds } from "app/models/app.server/customers/customer.server";
import { createShippingDiscount } from "app/models/shopify.server/discounts/discounts.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

export async function action({ request }: ActionFunctionArgs) {
  const context = await authenticate.admin(request);

  const formData = await request.formData();

  const body = formData.get("body") as string;

  const parsedBody = JSON.parse(body);

  try {
    if (request.method === "POST") {
      console.log("---------POST request received---------");
      const customers = await getCustomersByIds(parsedBody.customers, db);

      if (parsedBody.automaticOrCode === "CODE") {
        console.log("---------POST request received---------");

        const metafieldData = {
          customers: customers,
          //
          startDate: parsedBody.startDate,
          startTime: parsedBody.startTime,
          hasEndDate: parsedBody.hasEndDate,
          endDate: parsedBody.endDate,
          endTime: parsedBody.endTime,
          //
          code: parsedBody.code,
          type: parsedBody.type,
          value: parsedBody.value,
          //
          shippingRateType: parsedBody.shippingRateType,
          shippingRatesIds: parsedBody.shippingRatesIds,
        };

        const [shippingDiscount] = await Promise.all([
          createShippingDiscount(
            context.admin.graphql,
            parsedBody!.code,
            JSON.stringify(metafieldData),
          ),
        ]);

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
