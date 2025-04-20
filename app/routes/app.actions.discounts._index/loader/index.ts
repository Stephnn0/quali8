import type { LoaderFunctionArgs } from "@remix-run/node";
import { getActionsByShop } from "app/models/app.server/actions/actions.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    const actions = await getActionsByShop(
      {
        where: {
          shop: session.shop,
        },
        include: {
          shippingDiscount: true,
        },
      },
      db,
    );

    const ShippingDiscounts = actions
      ?.filter(
        (action: any) =>
          action.type === "SHIPPING_DISCOUNTS" && action.shippingDiscount,
      )
      .map((action: any) => action.shippingDiscount);

    return {
      payload: ShippingDiscounts,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}
