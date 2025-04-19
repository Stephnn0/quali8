import type { ActionFunctionArgs } from "@remix-run/node";
import { getCustomersByIds } from "app/models/app.server/customers/customer.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { createShippingDiscount } from "app/models/shopify.server/discounts/discounts.server";

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
