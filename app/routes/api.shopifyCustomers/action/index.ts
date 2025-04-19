import type { ActionFunctionArgs } from "@remix-run/node";
import { getCustomers } from "app/models/shopify.server/customers";
import { authenticate } from "app/shopify.server";
import { buildCustomerQuery } from "app/utils/queryEngine";

export default async function action({ request }: ActionFunctionArgs) {
  console.log("------------- API Get Customers Action -----------------");
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();

  const body = formData.get("body") as string;

  const parsedBody = JSON.parse(body);

  const { conditions, conditionLogicType } = parsedBody;

  console.log("Conditions:", conditions);
  console.log("Condition Logic Type:", conditionLogicType);

  const query = buildCustomerQuery(conditions, conditionLogicType);

  console.log("Built query:", query); // <-- helpful debug

  try {
    const customers = await getCustomers(admin.graphql, query);

    return { payload: customers };
  } catch (error) {
    console.error("API Get Customers Error: ", error);
  }
}
