import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { getManyShippingDiscountActions } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    const ShippingDiscounts = await getManyShippingDiscountActions(
      {
        where: {
          shop: session.shop,
        },
      },
      db,
    );

    return {
      payload: ShippingDiscounts,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}
