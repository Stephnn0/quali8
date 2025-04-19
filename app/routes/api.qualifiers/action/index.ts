import type { ActionFunctionArgs } from "@remix-run/node";
import { createQualifier } from "app/models/app.server/qualifiers/qualifier.server";
import db from "app/db.server";
import { authenticate } from "app/shopify.server";
import { createCondition } from "app/models/app.server/conditions/conditions.server";
import { createCustomer } from "app/models/app.server/customers/customer.server";

export default async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);

    const formData = await request.formData();

    const body = formData.get("body") as string;

    const parsedBody = JSON.parse(body);

    const { name, description, customers, conditions, conditionLogicType } =
      parsedBody;

    console.log("Parsed Body:", parsedBody);

    const data: Parameters<typeof createQualifier>[0]["data"] = {
      name,
      description,
      //   shop: session.shop,
      conditionLogicType,
      shopifyStore: { connect: { shop: session.shop } },
    };

    // Step 1: Create Qualifier
    const qualifier = await createQualifier({ data }, db);

    console.log("Qualifier Created:", qualifier);

    // for (const condition of conditions) {
    //   await createCondition(
    //     {
    //       data: {
    //         type: condition.type,
    //         comparisonType: condition.comparisonType,
    //         value: condition.value,
    //         qualifier: { connect: { id: qualifier?.id } },
    //         shopifyStore: { connect: { shop: session.shop } },
    //       },
    //     },
    //     db,
    //   );
    // }

    // // Step 3: Create/link Customers
    // for (const customer of customers) {
    //   await createCustomer(
    //     {
    //       data: {
    //         email: customer.email ?? `unknown-${customer.id}@placeholder.com`,
    //         firstName: customer.firstName,
    //         lastName: customer.lastName,
    //         shopifyStore: { connect: { shop: session.shop } },
    //         qualifiers: { connect: { id: qualifier?.id } },
    //       },
    //     },
    //     db,
    //   );
    // }

    return { status: "success", qualifier };
  } catch (error) {
    console.error("API Qualifiers Action Error: ", error);
  }
}
