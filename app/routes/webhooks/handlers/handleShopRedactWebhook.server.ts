import type { AuthWebhookContext } from "./types";
import db from "app/db.server";

export async function handleShopRedactWebhook(
  authWebhookContext: AuthWebhookContext,
) {
  const { webhookId, shop } = authWebhookContext;

  try {
    await db.$transaction([
      // ? We don't need to delete the shopifyStore because we don't hold any sensitive data in it
      // ? When we start collecting sensitive data in the future, we should do it in a separate table
      // ? And delete it here, instead of deleting the whole shopifyStore
      // db.shopifyStore.delete({
      //   where: { shop: payload.shop_domain },
      // }),

      db.session.deleteMany({ where: { shop } }),
    ]);
  } catch (error) {
    console.error(`${webhookId} - Error in handleShopRedactWebhook`);
  }

  return null;
}
