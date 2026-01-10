import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { getManyShippingDiscountActions } from "app/models/app.server/actionShippingDiscounts/actionShippingDiscounts.server";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";

export async function loader({ request }: LoaderFunctionArgs) {
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

    return handleApiSuccess<ManyShippingDiscountActionsLoaderData>({
      payload: {
        discounts: ShippingDiscounts,
        itemsPerPage,
        page,
        total: ShippingDiscounts?.shippingDiscountActionsCount ?? 0,
      },
      code: "success",
    });
  } catch (error) {
    console.log(error);
    return handleApiError({ errors: error, code: "error" });
  }
}

export type ManyShippingDiscountActionsLoaderData = {
  discounts: Awaited<ReturnType<typeof getManyShippingDiscountActions>>;
  itemsPerPage: number;
  page: number;
  total: number;
};
