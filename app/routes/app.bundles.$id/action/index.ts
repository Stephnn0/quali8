import type { ActionFunctionArgs } from "react-router";
import {
  createBundle,
  updateBundle,
  type BundleUpsertInput,
} from "app/models/app.server/bundles/bundles.server";
import {
  findUnpublishedProducts,
  getProductsPublicationStatus,
} from "app/models/shopify.server/products/products";
import { authenticate } from "app/shopify.server";
import db from "app/db.server";
import { trySyncBundleDiscounts } from "app/services/bundles/bundleDiscountSync.server";
import { handleApiSuccess } from "app/utils/handleApiSuccess";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";
import { bundleFormSchema } from "../zod";

/**
 * POST /app/bundles/new — create a bundle.
 * PUT  /app/bundles/:id — update a bundle (full replace of items).
 * Body is the codebase-standard `body` form field holding JSON.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const id = String(params.id || "");

  try {
    const formData = await request.formData();
    const parsed = bundleFormSchema.parse(
      JSON.parse(String(formData.get("body") ?? "{}")),
    );

    // The storefront adds bundle items through the Ajax Cart API, which
    // rejects the whole request if any product isn't live on the Online
    // Store — so refuse to save a bundle that could never be added to cart.
    const productIds = parsed.items.map((item) => item.productId);
    const products = await getProductsPublicationStatus(
      admin.graphql,
      productIds,
    );
    const foundIds = new Set(products.map((product) => product.id));
    const deleted = parsed.items.filter(
      (item) => !foundIds.has(item.productId),
    );
    const unpublished = findUnpublishedProducts(products);
    if (deleted.length || unpublished.length) {
      const names = [
        ...deleted.map((item) => item.productTitle),
        ...unpublished.map((product) => product.title),
      ].join(", ");
      return handleApiError({
        errors: `These products can't be added to the cart on your storefront: ${names}. Make sure each product is active and published to the Online Store sales channel, then save again.`,
        code: "error",
      });
    }

    const input: BundleUpsertInput = {
      title: parsed.title,
      description: parsed.description ?? null,
      status: parsed.status,
      discountPercent: parsed.discountPercent,
      items: parsed.items.map((item, index) => ({
        variantId: item.variantId,
        productId: item.productId,
        quantity: item.quantity,
        position: index,
        productTitle: item.productTitle,
        variantTitle: item.variantTitle ?? null,
        price: item.price,
        imageUrl: item.imageUrl ?? null,
      })),
    };

    if (request.method === "POST" && id === "new") {
      const bundle = await createBundle(session.shop, input, db);
      const syncError = await trySyncBundleDiscounts(session, db);
      if (syncError) return syncError;
      return handleApiSuccess({ payload: { bundle }, code: "saved" });
    }

    if (request.method === "PUT") {
      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return handleApiError({ errors: "Invalid bundle id", code: "error" });
      }

      const bundle = await updateBundle(session.shop, numericId, input, db);
      if (!bundle) {
        return handleApiError({ errors: "Bundle not found", code: "error" });
      }
      const syncError = await trySyncBundleDiscounts(session, db);
      if (syncError) return syncError;
      return handleApiSuccess({ payload: { bundle }, code: "saved" });
    }

    return handleApiError({ errors: "Unsupported request", code: "error" });
  } catch (error) {
    return handleApiError({ errors: error, code: "error" });
  }
}
