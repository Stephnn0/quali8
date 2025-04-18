import type { ActionFunctionArgs } from "@remix-run/node";
import { getCustomers } from "app/models/shopify.server/customers";
import { authenticate } from "app/shopify.server";

export default async function action({ request }: ActionFunctionArgs) {
  console.log("------------- API Get Customers Action -----------------");
  const { admin } = await authenticate.admin(request);

  try {
    const customers = await getCustomers(admin.graphql);

    return { payload: customers };
  } catch (error) {
    console.error("API Get Customers Error: ", error);
  }
}
