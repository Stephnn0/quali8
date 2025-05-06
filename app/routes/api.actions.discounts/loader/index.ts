import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { getManyShippingDiscountActions } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";

export default async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const itemsPerPage = 15;
  const skip = (page - 1) * itemsPerPage;

  try {
    const ShippingDiscounts = await getManyShippingDiscountActions(
      {
        where: {
          shop: session.shop,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: itemsPerPage,
        skip,
      },
      db,
    );

    return {
      shippingDiscounts: ShippingDiscounts?.shippingDiscountActions,
      itemsPerPage: itemsPerPage,
      page: page,
      total: ShippingDiscounts?.shippingDiscountActionsCount,
    };
  } catch (error) {
    console.log(error);
    return handleApiError({ errors: error, code: "error" });
  }
}
