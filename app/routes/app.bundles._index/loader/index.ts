import type { LoaderFunctionArgs } from "react-router";
import { getBundlesByShop } from "app/models/app.server/bundles/bundles.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;

  await gatekeepRoute({ authAdminContext }, { hasBundles: true }, "redirect"); // * Redirects

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const itemsPerPage = 15;
  const skip = (page - 1) * itemsPerPage;

  try {
    const { bundles, bundlesCount } = await getBundlesByShop(
      {
        where: { shop: session.shop },
        orderBy: { updatedAt: "desc" },
        take: itemsPerPage,
        skip,
      },
      db,
    );

    return handleApiSuccess<BundlesIndexData>({
      payload: {
        bundles,
        itemsPerPage,
        page,
        total: bundlesCount,
      },
      code: "success",
    });
  } catch (error) {
    console.log(error);
    return handleApiError({ errors: error, code: "error" });
  }
}

export type BundlesIndexData = {
  bundles: Awaited<ReturnType<typeof getBundlesByShop>>["bundles"];
  itemsPerPage: number;
  page: number;
  total: number;
};
