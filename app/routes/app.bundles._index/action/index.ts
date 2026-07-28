import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import {
  deleteBundle,
  setBundleStatus,
} from "app/models/app.server/bundles/bundles.server";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { trySyncBundleDiscounts } from "app/services/bundles/bundleDiscountSync.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";

const deleteSchema = z.object({
  bundleId: z.number().int().positive(),
});

const statusSchema = z.object({
  bundleId: z.number().int().positive(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

/**
 * DELETE — remove a bundle.
 * PATCH  — activate/deactivate a bundle.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const parsedBody = JSON.parse(String(formData.get("body") ?? "{}"));

    if (request.method === "DELETE") {
      const { bundleId } = deleteSchema.parse(parsedBody);
      await deleteBundle(session.shop, bundleId, db);
      const syncError = await trySyncBundleDiscounts(session, db);
      if (syncError) return syncError;
      return handleApiSuccess({ payload: { bundleId }, code: "deleted" });
    }

    if (request.method === "PATCH") {
      const { bundleId, status } = statusSchema.parse(parsedBody);
      const bundle = await setBundleStatus(session.shop, bundleId, status, db);
      if (!bundle) {
        return handleApiError({ errors: "Bundle not found", code: "error" });
      }
      const syncError = await trySyncBundleDiscounts(session, db);
      if (syncError) return syncError;
      return handleApiSuccess({ payload: { bundle }, code: "updated" });
    }

    return handleApiError({ errors: "Unsupported request", code: "error" });
  } catch (error) {
    return handleApiError({ errors: error, code: "error" });
  }
}
