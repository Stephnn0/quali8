import type { ActionFunctionArgs } from "@remix-run/node";
import { deleteQualifier } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { deleteManyConditions } from "app/models/app.server/conditions/conditions.server";

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const formData = await request.formData();

  const body = formData.get("body") as string;

  const parsedBody = JSON.parse(body);
  console.log("parsedBody", parsedBody);

  try {
    if (request.method === "DELETE") {
      console.log("-----------------delete------------");
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

    return null; // ! fixed to error
  } catch (error) {
    console.error("Error in action:", error);
  }
}
