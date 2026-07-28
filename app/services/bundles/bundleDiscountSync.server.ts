import type { PrismaClient } from "@prisma/client";
import type { Session } from "@shopify/shopify-app-react-router/server";
import { getActiveBundlesForShop } from "app/models/app.server/bundles/bundles.server";
import { getShopifyStore } from "app/models/app.server/shopifyStore/shopifyStore.server";
import {
  createBundleAutomaticDiscount,
  deleteBundleAutomaticDiscount,
  setBundleDiscountMetafield,
  type AdminCredentials,
} from "app/models/shopify.server/discounts/bundleDiscounts.server";
import { handleApiError } from "app/utils/server/handleApiResponse/handleApiError.server";
import { buildBundleDiscountConfig } from "./bundleDiscountConfig";

/**
 * Keeps the shop's single automatic app discount (backed by the
 * bundle-discounts function) in sync with the bundles in our DB. Call after
 * every bundle mutation: create, update, status change, delete.
 *
 * - no active bundles  → delete the discount
 * - first active bundle → create discount + config metafield
 * - otherwise          → rewrite the config metafield
 *
 * Without this discount, the storefront bundle card still renders discounted
 * prices but checkout charges full price.
 */
export async function syncBundleDiscounts(session: Session, db: PrismaClient) {
  const { shop, accessToken } = session;
  if (!accessToken) {
    throw new Error("No access token available to sync the bundle discount.");
  }
  const credentials: AdminCredentials = { shop, accessToken };

  const [bundles, store] = await Promise.all([
    getActiveBundlesForShop(shop, db),
    getShopifyStore({ where: { shop } }, db),
  ]);
  const activeBundles = bundles.filter((bundle) => bundle.items.length > 0);
  const currentDiscountId = store?.bundleDiscountId ?? null;

  if (activeBundles.length === 0) {
    if (currentDiscountId) {
      await deleteBundleAutomaticDiscount(credentials, currentDiscountId);
      await saveBundleDiscountId(shop, null, db);
    }
    return;
  }

  const configValue = JSON.stringify(buildBundleDiscountConfig(activeBundles));

  if (!currentDiscountId) {
    const discountId = await createBundleAutomaticDiscount(
      credentials,
      configValue,
    );
    await saveBundleDiscountId(shop, discountId, db);
    return;
  }

  const updated = await setBundleDiscountMetafield(
    credentials,
    currentDiscountId,
    configValue,
  );
  if (!updated) {
    // The stored discount is stale (e.g. deleted by the merchant in the
    // Shopify admin). Clean up whatever remains and recreate.
    await deleteBundleAutomaticDiscount(credentials, currentDiscountId);
    const discountId = await createBundleAutomaticDiscount(
      credentials,
      configValue,
    );
    await saveBundleDiscountId(shop, discountId, db);
  }
}

/**
 * Route-friendly wrapper: the bundle itself is already saved at this point,
 * so a sync failure doesn't roll anything back — but the merchant must know
 * checkout won't discount yet. Returns an error Response to send back, or
 * null when the sync succeeded.
 */
export async function trySyncBundleDiscounts(
  session: Session,
  db: PrismaClient,
) {
  try {
    await syncBundleDiscounts(session, db);
    return null;
  } catch (error) {
    console.error("bundle discount sync failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return handleApiError({
      errors: `Your bundle was saved, but updating the checkout discount failed: ${message} Save the bundle again to retry.`,
      code: "error",
    });
  }
}

async function saveBundleDiscountId(
  shop: string,
  bundleDiscountId: string | null,
  db: PrismaClient,
) {
  await db.shopifyStore.update({
    where: { shop },
    data: { bundleDiscountId },
  });
}
