import type { ActionFunctionArgs } from "@remix-run/node";
import {
  createQualifier,
  deleteQualifier,
  updateQualifier,
} from "app/models/app.server/qualifiers/qualifier.server";
import db from "app/db.server";
import { authenticate } from "app/shopify.server";
import {
  createCondition,
  deleteManyConditions,
} from "app/models/app.server/conditions/conditions.server";
import { upsertCustomer } from "app/models/app.server/customers/customer.server";

export default async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);

    const formData = await request.formData();

    const body = formData.get("body") as string;

    const parsedBody = JSON.parse(body);

    const { name, description, customers, conditions, conditionLogicType } =
      parsedBody;

    console.log(parsedBody, "parsedBody");

    if (request.method === "POST") {
      // ! we first create the qualifier and then create and connect conditions and customers
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
            shopifyId: customer.shopifyId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            amountSpent: customer.amountSpent,
            orderCount: customer.orderCount,
            country: customer.country,
            shop: session.shop,
            qualifierId: qualifier?.id,
          });
        }
      }

      return { status: "success", qualifier };
    }

    if (request.method === "PUT") {
      const updatedQualifier = await updateQualifier(
        {
          where: { id: parsedBody.id, shop: session.shop },
          data: {
            name: parsedBody.name,
            description: parsedBody.description,
            conditionLogicType: parsedBody.conditionLogicType,
          },
        },
        db,
      );

      if (updatedQualifier) {
        deleteManyConditions(
          {
            where: {
              qualifierId: updatedQualifier?.id,
              shopifyStore: { shop: session.shop },
            },
          },
          db,
        );

        for (const condition of conditions) {
          await createCondition(
            {
              data: {
                type: condition.type,
                comparisonType: condition.comparisonType,
                value: condition.value,
                qualifier: { connect: { id: updatedQualifier.id } },
                shopifyStore: { connect: { shop: session.shop } },
              },
            },
            db,
          );
        }

        // 3. Upsert customers
        for (const customer of customers) {
          await upsertCustomer(db, {
            shopifyId: customer.shopifyId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            amountSpent: customer.amountSpent,
            orderCount: customer.orderCount,
            country: customer.country,
            shop: session.shop,
            qualifierId: updatedQualifier.id,
          });
        }
      }

      return { status: "updated", updatedQualifier };
    }

    if (request.method === "DELETE") {
      await Promise.all([
        deleteQualifier(
          {
            where: {
              id: parsedBody.qualifierId,
            },
          },
          db,
        ),

        deleteManyConditions(
          {
            where: {
              id: {
                in: parsedBody.conditionIds,
              },
            },
          },
          db,
        ),
      ]);

      return { payload: "deleted success" };
    }

    return { status: "error" };
  } catch (error) {
    console.error("API Qualifiers Action Error: ", error);
  }
}
