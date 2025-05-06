import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifiersByShopWithCustomersAndConditions } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";
import { handleApiSuccess } from "~/utils/handleApiSuccess";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const itemsPerPage = 15;
  const skip = (page - 1) * itemsPerPage;

  try {
    const qualifiers = await getQualifiersByShopWithCustomersAndConditions(
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

    // return {
    //   payload: qualifiers?.qualifiers,
    //   itemsPerPage: itemsPerPage,
    //   page: page,
    //   total: qualifiers?.qualifiersCount,
    // };

    return handleApiSuccess<ManyQualifiersByShopWithCustomersAndConditions>({
      payload: {
        qualifiersAndConditions: qualifiers,
        itemsPerPage,
        page,
        total: qualifiers?.qualifiersCount ?? 0,
      },
      code: "success",
    });
  } catch (error) {
    console.log(error);
    return handleApiError({ errors: error, code: "error" });
  }
}

export type ManyQualifiersByShopWithCustomersAndConditions = {
  qualifiersAndConditions: Awaited<
    ReturnType<typeof getQualifiersByShopWithCustomersAndConditions>
  >;
  itemsPerPage: number;
  page: number;
  total: number;
};
