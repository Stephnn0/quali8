import type { AuthWebhookContext } from "./types";
import db from "app/db.server";

export async function handleAppUninstalledWebhook(
  authWebhookContext: AuthWebhookContext,
) {
  const { shop, webhookId } = authWebhookContext;

  try {
    const deleteSessionsPromise = db.session.deleteMany({ where: { shop } });
    const updateStorePromise = db.shopifyStore.update({
      where: { shop },
      data: { status: "UNINSTALLED" },
    });

    await Promise.all([deleteSessionsPromise, updateStorePromise]);
  } catch (error) {
    console.error(`${webhookId} - Error in appUninstalledWebhookHandler`); // eslint-disable-line no-console
  }
}
