import type { LoaderFunctionArgs } from "@remix-run/node";
import { getQualifiersByShop } from "app/models/app.server/qualifiers/qualifier.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { handleApiError } from "~/utils/server/handleApiResponse/handleApiError.server";

export default async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const itemsPerPage = 15;
  const skip = (page - 1) * itemsPerPage;

  try {
    const qualifiers = await getQualifiersByShop(
      {
        where: {
          shop: session.shop,
        },
        include: {
          customers: true,
          conditions: true,
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
      qualifiers: qualifiers?.qualifiers,
      itemsPerPage: itemsPerPage,
      page: page,
      total: qualifiers?.qualifiersCount,
    };
  } catch (error) {
    console.error("Error at api/qualifiers: ", error);
    return handleApiError({ errors: error, code: "error" });
  }
}
