import type { ActionFunctionArgs } from "@remix-run/node";
import { createQualifier } from "app/models/app.server/qualifiers/qualifier.server";
import db from "app/db.server";
import { authenticate } from "app/shopify.server";
import { createCondition } from "app/models/app.server/conditions/conditions.server";
import { upsertCustomer } from "app/models/app.server/customers/customer.server";

export default async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);

    const formData = await request.formData();

    const body = formData.get("body") as string;

    const parsedBody = JSON.parse(body);

    const { name, description, customers, conditions, conditionLogicType } =
      parsedBody;

    const data: Parameters<typeof createQualifier>[0]["data"] = {
      name,
      description,
      conditionLogicType,
      shopifyStore: { connect: { shop: session.shop } },
    };

    const qualifier = await createQualifier({ data }, db);

    if (qualifier) {
      for (const condition of conditions) {
        await createCondition(
          {
            data: {
              type: condition.type,
              comparisonType: condition.comparisonType,
              value: condition.value,
              qualifier: { connect: { id: qualifier?.id } },
              shopifyStore: { connect: { shop: session.shop } },
            },
          },
          db,
        );
      }

      for (const customer of customers) {
        await upsertCustomer(db, {
          email: customer.email ?? `${customer.id}`,
          firstName: customer.firstName,
          lastName: customer.lastName,
          shop: session.shop,
          qualifierId: qualifier?.id,
        });
      }
    }

    return { status: "success", qualifier };
  } catch (error) {
    console.error("API Qualifiers Action Error: ", error);
  }
}
