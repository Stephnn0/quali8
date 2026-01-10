import type { ActionFunctionArgs } from "react-router";
import { deleteActionShippingDiscount } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import {
  deleteShippingAutomaticDiscount,
  deleteShippingCodeDiscount,
} from "app/models/shopify.server/discounts/discounts.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export default async function action({ request }: ActionFunctionArgs) {
  const context = await authenticate.admin(request);

  const formData = await request.formData();

  const body = formData.get("body") as string;

  const parsedBody = JSON.parse(body);

  try {
    await gatekeepRoute(
      { authAdminContext: context },
      { hasShippingDiscounts: true },
      "throw",
    ); // * Throw

    if (request.method === "DELETE") {
      console.log("...DELETE Request...");

      await Promise.all([
        deleteActionShippingDiscount(
          {
            where: {
              id: parsedBody.shippingDiscountId,
            },
          },
          db,
        ),
      ]);

      if (parsedBody.automaticOrCode === "CODE") {
        await deleteShippingCodeDiscount(
          context.admin.graphql,
          parsedBody.shopifyDiscountId,
        );
      }

      if (parsedBody.automaticOrCode === "AUTOMATIC") {
        await deleteShippingAutomaticDiscount(
          context.admin.graphql,
          parsedBody.shopifyDiscountId,
        );
      }

      return { payload: "success" };
    }

    return null; // ! fixed to error
  } catch (error) {
    console.error("Error in action:", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
