import type { LoaderFunctionArgs } from "react-router";
import { getBundleByIdForShop } from "app/models/app.server/bundles/bundles.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { gatekeepRoute } from "app/services/subscriptions/gatekeepRoute";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";
import type { BundleLoaderData } from "../types";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const authAdminContext = await authenticate.admin(request);
  const { session } = authAdminContext;
  const id = String(params.id || "");

  await gatekeepRoute({ authAdminContext }, { hasBundles: true }, "redirect"); // * Redirects

  try {
    if (id === "new") {
      // The plan may include bundles but only so many (Free: one).
      const bundleAmount = await db.bundle.count({ where: { shop: session.shop } });
      await gatekeepRoute(
        { authAdminContext, amounts: { bundleAmount } },
        { bundleLimit: true },
        "redirect",
      ); // * Redirects
      return handleApiSuccess<BundleLoaderData>({
        payload: { bundle: null },
        code: "loaded",
      });
    }

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return handleApiSuccess<BundleLoaderData>({
        payload: { bundle: null },
        code: "not_found",
      });
    }

    const bundle = await getBundleByIdForShop(session.shop, numericId, db);

    return handleApiSuccess<BundleLoaderData>({
      payload: { bundle },
      code: bundle ? "loaded" : "not_found",
    });
  } catch (error) {
    console.log(error);
    return handleApiError({ errors: error, code: "error" });
  }
}
