import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { $API$ACTIONS$DISCOUNTS } from "../constants";
import { parseJSONBody } from "app/utils/parseJSONBody";
import createShippingDiscountServer from "./createShippingDiscount.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import updateShippingDiscountServer from "./updateShippingDiscount.server";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";

const {
  ACTIONS_ZOD,
  ACTIONS: { CREATE, UPDATE },
} = $API$ACTIONS$DISCOUNTS;

export default async function action({ request }: ActionFunctionArgs) {
  const context = await authenticate.admin(request);

  const { action: code, unsafeBody } = await parseJSONBody(
    request,
    ACTIONS_ZOD,
    { key: "action" },
  );

  try {
    if (request.method === "POST") {
      switch (code) {
        case "create": {
          // const co = true;
          // if (co) throw new Error("hello world bro weeoe");
          const bodyParsed = CREATE.ZOD.parse(unsafeBody);

          const createdShippingDiscount = await createShippingDiscountServer(
            context,
            bodyParsed,
          );

          return handleApiSuccess({
            payload: { shippingDiscount: createdShippingDiscount },
            code: "created",
          });
        }

        default: {
          throw ["Invalid action"];
        }
      }
    }

    if (request.method === "PUT") {
      switch (code) {
        case "update": {
          const bodyParsed = UPDATE.ZOD.parse(unsafeBody);

          const updatedShippingDiscount = updateShippingDiscountServer(
            context,
            bodyParsed,
          );

          return handleApiSuccess({
            payload: { shippingDiscount: updatedShippingDiscount },
            code: "updated",
          });
        }

        default: {
          throw ["Invalid action"];
        }
      }
    }

    return { payload: null };
  } catch (error) {
    console.error("API Get Customers Error: ", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
